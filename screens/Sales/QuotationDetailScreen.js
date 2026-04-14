import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Package,
  Edit,
  Trash2,
  Download,
  ShoppingCart,
  Send,
  CheckCircle,
  Warehouse,
  ExternalLink,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, useCurrency } from '../../utils/currency';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function QuotationDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [quotation, setQuotation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [whModalVisible, setWhModalVisible] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [whLoading, setWhLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchQuotation();
    });
    return unsubscribe;
  }, [navigation, id]);

  const fetchQuotation = async () => {
    try {
      const { data } = await axiosInstance.get(`/quotations/${id}`);
      if (data.success) {
        setQuotation(data.data);
      }
    } catch (error) {
      console.error('Error fetching quotation details', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!['draft', 'sent'].includes(quotation?.status)) {
      Alert.alert('Not Allowed', 'Only draft or sent quotations can be deleted.');
      return;
    }

    Alert.alert('Delete Quotation', 'Are you sure you want to delete this quote?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axiosInstance.delete(`/quotations/${id}`);
          navigation.goBack();
        } catch(error) {
          Alert.alert('Error', 'Failed to delete quotation');
        }
      }}
    ]);
  };

  const handleDownloadPDF = async () => {
    try {
      let fullOrg = {};
      try {
        const { data: orgData } = await axiosInstance.get('/organizations/me');
        if (orgData?.success) {
          fullOrg = orgData.data.organization;
        }
      } catch (e) {
        console.log('Could not fetch rich org data, falling back to local user context', e);
      }

      const org = fullOrg._id ? fullOrg : (user?.organization || {});
      const companyPhone = org.phone || user?.phone || '';
      const addrObj = org.address || {};
      const companyAddress = [addrObj.street, addrObj.city, addrObj.state, addrObj.zipCode].filter(Boolean).join(', ');
      
      const taxDetails = [];
      if (org.taxId) taxDetails.push(`EIN: ${org.taxId}`);
      if (org.vatNumber) taxDetails.push(`VAT: ${org.vatNumber}`);
      if (org.registrationNumber) taxDetails.push(`Reg NO: ${org.registrationNumber}`);
      const companyTax = taxDetails.join(' | ');
      const currencyCode = org.settings?.currency || quotation.currency?.code || 'USD';

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #334155; }
              .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
              .header-left h1 { margin: 0; color: #0f172a; font-size: 24px; }
              .header-right { text-align: right; }
              .header-right h2 { margin: 0; color: #4f46e5; font-size: 28px; letter-spacing: 2px;}
              .customer-box { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; width: 50%; }
              .customer-box strong { color: #4f46e5; font-size: 12px; letter-spacing: 1px;}
              .customer-name { font-size: 18px; font-weight: bold; margin-top: 8px; color: #0f172a;}
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #4f46e5; color: white; padding: 12px; text-align: left; font-size: 14px;}
              td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;}
              .totals-wrapper { display: flex; justify-content: flex-end; margin-top: 30px;}
              .totals { width: 300px; background: #f8fafc; padding: 20px; border-radius: 8px;}
              .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;}
              .grand-total { font-size: 18px; font-weight: bold; color: #4f46e5; border-top: 2px solid #6366f1; padding-top: 12px; margin-top: 8px;}
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-left">
                <h1>${org.name || user?.organizationName || user?.name || 'Company Details'}</h1>
                ${user?.email ? `<div style="color: #64748b; font-size: 13px; margin-top: 6px;">${user.email}</div>` : ''}
                ${companyPhone ? `<div style="color: #64748b; font-size: 13px; margin-top: 4px;">${companyPhone}</div>` : ''}
                ${companyAddress ? `<div style="color: #64748b; font-size: 13px; margin-top: 4px;">${companyAddress}</div>` : ''}
                ${companyTax ? `<div style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600;">${companyTax}</div>` : ''}
              </div>
              <div class="header-right">
                <h2>QUOTATION</h2>
                <div style="color: #64748b; font-size: 14px; margin-top: 8px;">#${escapeHtml(quotation.quotationNumber)}</div>
              </div>
            </div>
            
            <div class="customer-box">
              <strong>BILL TO</strong>
              <div class="customer-name">${escapeHtml(quotation.customer?.name || 'Customer')}</div>
              <div style="color: #64748b; font-size: 14px; margin-top: 4px;">${escapeHtml(quotation.customer?.phone || '')}</div>
            </div>

            <table>
              <tr>
                <th>Item Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
              ${quotation.items.map(item => `
                <tr>
                  <td><strong>${escapeHtml(item.product?.name || item.productName || 'Item')}</strong></td>
                  <td>${escapeHtml(item.quantity)}</td>
                  <td>${formatCurrency(item.unitPrice || 0, currencyCode)}</td>
                  <td style="text-align: right;">${formatCurrency((item.quantity * item.unitPrice) || 0, currencyCode)}</td>
                </tr>
              `).join('')}
            </table>

            <div class="totals-wrapper">
              <div class="totals">
                <div class="total-row"><span style="color: #64748b;">Subtotal:</span><strong style="color: #0f172a;">${formatCurrency(quotation.subtotal || 0, currencyCode)}</strong></div>
                <div class="total-row"><span style="color: #64748b;">Tax:</span><strong style="color: #0f172a;">${formatCurrency(quotation.taxAmount || 0, currencyCode)}</strong></div>
                <div class="total-row grand-total"><span>Total Estimate:</span><span>${formatCurrency(quotation.totalAmount || 0, currencyCode)}</span></div>
              </div>
            </div>
            
            <div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px;">
              Valid until ${new Date(quotation.validUntil).toLocaleDateString()}
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { dialogTitle: 'Download Quotation PDF' });
    } catch (err) {
      console.error('PDF Error:', err);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'sent': return '#3b82f6';
      case 'converted': return '#7c3aed';
      case 'expired': return '#b45309';
      case 'draft': default: return '#6b7280';
    }
  };

  const canConvertToOrder =
    quotation &&
    !quotation.convertedToOrder &&
    ['sent', 'accepted'].includes(quotation.status);

  const openWarehouseModal = async () => {
    if (!canConvertToOrder) return;
    setWhModalVisible(true);
    if (warehouses.length) return;
    setWhLoading(true);
    try {
      const { data } = await axiosInstance.get('/warehouses?page=1&limit=50');
      if (data?.success) setWarehouses(data.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not load warehouses.');
      setWhModalVisible(false);
    } finally {
      setWhLoading(false);
    }
  };

  const handleSelectWarehouse = async (wh) => {
    if (!wh?._id || isConverting) return;
    setIsConverting(true);
    try {
      const { data } = await axiosInstance.post(`/quotations/${id}/convert`, {
        warehouse: wh._id,
      });
      if (data?.success && data.data?.salesOrder?._id) {
        setWhModalVisible(false);
        setQuotation(data.data.quotation);
        Alert.alert('Sales order created', `Order ${data.data.salesOrder.orderNumber || ''} was created from this quote.`, [
          {
            text: 'View order',
            onPress: () => navigation.replace('OrderDetail', { id: data.data.salesOrder._id }),
          },
          { text: 'Stay', style: 'cancel' },
        ]);
      }
    } catch (error) {
      Alert.alert(
        'Could not create order',
        error.response?.data?.message || error.message || 'Request failed'
      );
    } finally {
      setIsConverting(false);
    }
  };

  const patchQuotationStatus = async (nextStatus) => {
    setStatusBusy(true);
    try {
      const { data } = await axiosInstance.put(`/quotations/${id}/status`, { status: nextStatus });
      if (data?.success) setQuotation(data.data);
    } catch (error) {
      Alert.alert('Update failed', error.response?.data?.message || error.message || 'Request failed');
    } finally {
      setStatusBusy(false);
    }
  };

  if (isLoading && !quotation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!quotation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Quotation not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote {quotation.quotationNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quotation.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(quotation.status) }]}>
            {(quotation.status || 'draft').toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ACTION PANEL */}
        <View style={styles.actionPanel}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]}
            onPress={handleDownloadPDF}
          >
            <Download size={18} color="#4f46e5" />
            <Text style={[styles.actionText, { color: '#4f46e5' }]}>Download PDF</Text>
          </TouchableOpacity>

          {quotation.status === 'draft' && !quotation.convertedToOrder && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' }]}
              onPress={() => patchQuotationStatus('sent')}
              disabled={statusBusy}
            >
              <Send size={18} color="#2563eb" />
              <Text style={[styles.actionText, { color: '#2563eb' }]}>Mark sent</Text>
            </TouchableOpacity>
          )}

          {quotation.status === 'sent' && !quotation.convertedToOrder && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' }]}
              onPress={() => patchQuotationStatus('accepted')}
              disabled={statusBusy}
            >
              <CheckCircle size={18} color="#059669" />
              <Text style={[styles.actionText, { color: '#059669' }]}>Accept</Text>
            </TouchableOpacity>
          )}

          {canConvertToOrder && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' }]}
              onPress={openWarehouseModal}
              disabled={statusBusy || isConverting}
            >
              <ShoppingCart size={18} color="#c2410c" />
              <Text style={[styles.actionText, { color: '#c2410c' }]}>Sales order</Text>
            </TouchableOpacity>
          )}

          {quotation.convertedToOrder && quotation.salesOrder && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' }]}
              onPress={() =>
                navigation.navigate('OrderDetail', {
                  id: typeof quotation.salesOrder === 'object' ? quotation.salesOrder._id : quotation.salesOrder,
                })
              }
            >
              <ExternalLink size={18} color="#6d28d9" />
              <Text style={[styles.actionText, { color: '#6d28d9' }]}>Open order</Text>
            </TouchableOpacity>
          )}
          
          {(quotation.status === 'draft' || quotation.status === 'sent') && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }]}
              onPress={() => navigation.navigate('QuotationEdit', { id: quotation._id })}
            >
              <Edit size={18} color="#475569" />
              <Text style={[styles.actionText, { color: '#475569' }]}>Edit</Text>
            </TouchableOpacity>
          )}

          {['draft', 'sent'].includes(quotation.status) && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
              onPress={handleDelete}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Customer Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={18} color="#64748b" />
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>
          <Text style={styles.cardValue}>{quotation.customer?.name || '—'}</Text>
          {quotation.customer?.company ? (
            <Text style={styles.cardSubValue}>{quotation.customer.company}</Text>
          ) : null}
          {quotation.customer?.type ? (
            <Text style={styles.cardSubValue}>
              {(quotation.customer.type === 'wholesale' ? 'Wholesale' : 'Retail') + ' customer'}
            </Text>
          ) : null}
          {quotation.customer?.email ? <Text style={styles.cardSubValue}>{quotation.customer.email}</Text> : null}
          {quotation.customer?.phone ? <Text style={styles.cardSubValue}>{quotation.customer.phone}</Text> : null}
          {quotation.customer?.alternatePhone ? (
            <Text style={styles.cardSubValue}>Alt: {quotation.customer.alternatePhone}</Text>
          ) : null}
          {quotation.customer?.taxNumber ? (
            <Text style={styles.cardSubValue}>Tax / VAT: {quotation.customer.taxNumber}</Text>
          ) : null}
          {quotation.customer?.address &&
          [quotation.customer.address.street, quotation.customer.address.city, quotation.customer.address.state]
            .filter(Boolean).length ? (
            <Text style={[styles.cardSubValue, { marginTop: 8 }]}>
              {[
                quotation.customer.address.street,
                [quotation.customer.address.city, quotation.customer.address.state].filter(Boolean).join(', '),
                [quotation.customer.address.postalCode, quotation.customer.address.country].filter(Boolean).join(' '),
              ]
                .filter(Boolean)
                .join('\n')}
            </Text>
          ) : null}
          {quotation.customer?.notes ? (
            <Text style={[styles.cardSubValue, { marginTop: 8, fontStyle: 'italic' }]}>{quotation.customer.notes}</Text>
          ) : null}
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color="#64748b" />
            <Text style={styles.cardTitle}>Timeline</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Created:</Text>
            <Text style={styles.value}>{new Date(quotation.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Valid Until:</Text>
            <Text style={styles.value}>{new Date(quotation.validUntil).toLocaleDateString()}</Text>
          </View>
          {quotation.convertedToOrder && quotation.salesOrder ? (
            <View style={styles.row}>
              <Text style={styles.label}>Sales order:</Text>
              <Text style={styles.value}>
                {typeof quotation.salesOrder === 'object' && quotation.salesOrder.orderNumber
                  ? quotation.salesOrder.orderNumber
                  : 'Linked'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={18} color="#64748b" />
            <Text style={styles.cardTitle}>Line Items ({quotation.items?.length || 0})</Text>
          </View>
          {quotation.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.product?.name || item.productName || 'Unknown Product'}</Text>
                <Text style={styles.itemMeta}>{item.quantity} x {formatAmount(item.unitPrice || 0)}</Text>
              </View>
              <Text style={styles.itemTotal}>{formatAmount(item.totalPrice || (item.quantity * item.unitPrice))}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <DollarSign size={18} color="#64748b" />
            <Text style={styles.cardTitle}>Summary</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal:</Text>
            <Text style={styles.value}>{formatAmount(quotation.subtotal || 0)}</Text>
          </View>
          {(quotation.discountAmount || 0) > 0 && (
             <View style={styles.row}>
               <Text style={styles.label}>Discount:</Text>
               <Text style={[styles.value, {color: '#10b981'}]}>-{formatAmount(quotation.discountAmount || 0, { absolute: true })}</Text>
             </View>
          )}
          {(quotation.taxAmount || 0) > 0 && (
             <View style={styles.row}>
               <Text style={styles.label}>Tax {quotation.taxRate ? `(${quotation.taxRate}%)` : ''}:</Text>
               <Text style={styles.value}>{formatAmount(quotation.taxAmount || 0)}</Text>
             </View>
          )}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Estimate:</Text>
            <Text style={styles.totalValue}>{formatAmount(quotation.totalAmount || 0)}</Text>
          </View>
        </View>
        
        <View style={{height: 40}}/>

      </ScrollView>

      <Modal visible={whModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Warehouse size={22} color="#4f46e5" />
              <Text style={styles.modalTitle}>Fulfillment warehouse</Text>
            </View>
            <Text style={styles.modalCaption}>
              Stock will be allocated from this warehouse for the new sales order.
            </Text>
            {whLoading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} size="large" color="#4f46e5" />
            ) : (
              <FlatList
                data={warehouses}
                keyExtractor={(w) => w._id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: '70%' }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalRow}
                    onPress={() => handleSelectWarehouse(item)}
                    disabled={isConverting}
                  >
                    <Text style={styles.modalRowTitle}>{item.name}</Text>
                    {item.code ? <Text style={styles.modalRowHint}>{item.code}</Text> : null}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalEmpty}>No warehouses found. Add one in the web app first.</Text>
                }
              />
            )}
            {isConverting ? (
              <Text style={styles.modalBusy}>Creating order…</Text>
            ) : null}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => !isConverting && setWhModalVisible(false)}
              disabled={isConverting}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIcon: { marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 16 },
  
  actionPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6
  },
  actionText: {
    fontWeight: '600',
    fontSize: 14
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  cardValue: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  cardSubValue: { fontSize: 14, color: '#64748b', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: '500', color: '#334155' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  itemMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#4f46e5' },
  errorText: { fontSize: 16, color: '#ef4444', marginBottom: 16 },
  backButton: { backgroundColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  backButtonText: { fontWeight: '600', color: '#334155' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalCaption: { fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 20 },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalRowTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  modalRowHint: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  modalEmpty: { textAlign: 'center', color: '#94a3b8', marginVertical: 24, paddingHorizontal: 12 },
  modalBusy: { textAlign: 'center', color: '#4f46e5', fontWeight: '600', marginTop: 8 },
  modalClose: { marginTop: 16, alignItems: 'center', padding: 12 },
  modalCloseText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
});
