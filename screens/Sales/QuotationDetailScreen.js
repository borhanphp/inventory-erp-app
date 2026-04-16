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
import { useCurrency } from '../../utils/currency';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatPlainAmount = (amount, decimals = 2) => (Number(amount) || 0).toFixed(decimals);

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
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await axiosInstance.delete(`/quotations/${id}`);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete quotation');
          }
        }
      }
    ]);
  };

  const handleDownloadPDF = async () => {
    try {
      let fullOrg = {};
      try {
        const { data: orgData } = await axiosInstance.get('/profile/organization');
        if (orgData?.success) {
          fullOrg = orgData.data;
        }
      } catch (e) {
        console.log('Could not fetch org data, falling back to local user context', e);
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

      const customerObj = quotation.isCustomCustomer ? quotation.customCustomer : quotation.customer;
      const customerName = customerObj?.name;
      const customerPhone = customerObj?.phone;
      const customerAddress =
        customerObj?.address?.street
          ? [
            customerObj.address.street,
            customerObj.address.city,
            customerObj.address.state,
            customerObj.address.postalCode || customerObj.address.zipCode,
            customerObj.address.country,
          ].filter(Boolean).join(', ')
          : '';
      const currencyCode = org.settings?.currency || quotation.currency?.code || 'USD';

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #000; margin: 0; }
              .top-header { text-align: center; margin-bottom: 20px; position: relative; }
              .logo-img { position: absolute; left: 0; top: 0; width: 80px; height: 80px; object-fit: contain; }
              .logo-placeholder { position: absolute; left: 0; top: 0; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid #000; color: #000; }
              .company-name { font-size: 26px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
              .company-address { font-size: 13px; margin-bottom: 3px; }
              .company-tax-info { font-size: 13px; margin-bottom: 3px; }
              .company-contact { font-size: 13px; }
              .title-row { margin-top: 35px; margin-bottom: 15px; position: relative; display: flex; justify-content: center; align-items: center; }
              .invoice-title { font-size: 22px; font-weight: bold; text-transform: uppercase; }
              .trn-title { position: absolute; right: 0; font-size: 18px; font-weight: bold; }
              .boxes-container { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; width: 100%; }
              .customer-box { flex: 1; border: 1px solid #000; border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.6; }
              .customer-box .bold-name { font-weight: bold; font-size: 14px; display: block; margin-bottom: 4px; }
              .customer-box .bold-text { font-weight: bold; }
              .details-box { flex: 1; border: 1px solid #000; border-radius: 8px; overflow: hidden; }
              .details-table { width: 100%; border-collapse: collapse; height: 100%; font-size: 13px; }
              .details-table td { padding: 8px 12px; border-bottom: 1px solid #000; }
              .details-table tr:last-child td { border-bottom: none; }
              .details-table td:first-child { border-right: 1px solid #000; font-weight: bold; width: 40%; }
              .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .items-table th { border: 1px solid #000; padding: 4px; text-align: center; font-size: 11px; font-weight: bold; }
              .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 6px; font-size: 11px; text-align: center; }
              .items-table td:nth-child(2) { text-align: left; }
              .items-table tr.last-item-row td { border-bottom: 1px solid #000; }
              .items-table tr.empty-row td { height: 100px; border-bottom: 1px solid #000; }
              .items-table tr:last-child td { border-bottom: 1px solid #000; }
              .bottom-section { display: flex; width: 100%; border: 1px solid #000; margin-top: 0; border-top: none; }
              .bottom-left { flex: 1; padding: 10px; font-size: 11px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: space-between; }
              .bottom-right { width: 320px; }
              .totals-table { width: 100%; border-collapse: collapse; font-size: 12px; }
              .totals-table td { padding: 6px 10px; border-bottom: 1px solid #000; }
              .totals-table td:first-child { text-align: right; border-right: 1px solid #000; width: 65%; }
              .totals-table td:last-child { text-align: right; font-weight: bold; }
              .word-amount { padding: 6px 10px; font-size: 10px; border-top: 1px solid #000; }
              .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; font-weight: bold; text-align: center; }
              .sig-block { flex: 1; }
              .sig-line { text-decoration: underline; margin-bottom: 6px; }
              .sig-meta { font-size: 10px; font-weight: normal; color: #555; text-align: left; padding-left: 10%; }
            </style>
          </head>
          <body>
            <div class="top-header">
              ${org.logo ? `<img src="${org.logo}" alt="Company Logo" class="logo-img" />` : `<div class="logo-placeholder">LOGO</div>`}
              <div class="company-name">${escapeHtml(org.name || user?.organizationName || user?.name || 'Company Details')}</div>
              ${companyAddress ? `<div class="company-address">${companyAddress}</div>` : ''}
              ${org.registrationNumber ? `<div class="company-tax-info">Tax Regn No. ${org.registrationNumber}</div>` : ''}
              <div class="company-contact">
                ${companyPhone ? `Tel : ${companyPhone}` : ''}
                ${companyPhone && user?.email ? ', &nbsp;&nbsp;' : ''}
                ${user?.email ? `Email : ${user.email}` : ''}
              </div>
            </div>

            <div class="title-row">
              <div class="invoice-title">Tax QUOTATION</div>
              ${org.taxId || org.vatNumber ? `<div class="trn-title">TRN : ${org.taxId || org.vatNumber}</div>` : ''}
            </div>

            <div class="boxes-container">
              <div class="customer-box">
                <div class="bold-name">M/s ${escapeHtml(customerName || 'Customer')}</div>
                ${customerAddress ? `<div class="bold-text">${escapeHtml(customerAddress)}</div>` : ''}
                <div class="bold-text" style="margin-top: 8px;">
                  ${customerPhone ? `Tel : ${escapeHtml(customerPhone)} &nbsp;&nbsp;&nbsp;` : ''}
                  ${customerObj?.email ? `Email : ${escapeHtml(customerObj.email)}` : ''}
                </div>
                ${customerObj?.taxNumber || customerObj?.taxId ? `<div class="bold-text" style="margin-top: 4px;">TRN : ${escapeHtml(customerObj.taxNumber || customerObj.taxId)}</div>` : ''}
              </div>

              <div class="details-box">
                <table class="details-table">
                  <tr>
                    <td>Quotation No :</td>
                    <td>${escapeHtml(quotation.quotationNumber || '')}</td>
                  </tr>
                  <tr>
                    <td>Date :</td>
                    <td>${new Date(quotation.createdAt).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td>Valid Until :</td>
                    <td>${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : ''}</td>
                  </tr>
                  <tr>
                    <td>Status :</td>
                    <td>${(quotation.status || 'draft').toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td>Currency</td>
                    <td>${currencyCode}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">Payment Terms : ${escapeHtml(quotation.terms || 'As per agreement')}</div>
            <table class="items-table">
              <tr>
                <th rowspan="2">S.N</th>
                <th rowspan="2">Description</th>
                <th rowspan="2">Unit</th>
                <th rowspan="2">Qty</th>
                <th rowspan="2">Rate</th>
                <th rowspan="2">Value<br/>before<br/>Discount</th>
                <th rowspan="2">Disc.</th>
                <th rowspan="2">Gross<br/>Value<br/>before VAT</th>
                <th colspan="2" style="text-align: center;">VAT</th>
                <th rowspan="2">Net Value</th>
              </tr>
              <tr>
                <th style="border-top: none;">%</th>
                <th style="border-top: none; border-left: 1px solid #000;">Amount</th>
              </tr>
              ${quotation.items?.map((item, index) => {
        const valueBeforeDiscount = (Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2);
        const lineDiscount = '0.00';
        const grossBeforeVat = valueBeforeDiscount;
        const taxPercent = '';
        const taxAmount = '0.00';
        const netValue = (Number(item.totalPrice) || Number(grossBeforeVat) || 0).toFixed(2);

        return `
                <tr ${index === quotation.items.length - 1 ? 'class="last-item-row"' : ''}>
                  <td>${index + 1}</td>
                  <td width="40%"><strong>${escapeHtml(item.description || item.product?.name || item.productName || 'Item')}</strong></td>
                  <td>${escapeHtml(item.unit || '')}</td>
                  <td>${Number(item.quantity || 0).toFixed(2)}</td>
                  <td>${formatPlainAmount(item.unitPrice || 0)}</td>
                  <td>${formatPlainAmount(valueBeforeDiscount)}</td>
                  <td>${Number(lineDiscount) > 0 ? formatPlainAmount(lineDiscount) : ''}</td>
                  <td>${formatPlainAmount(grossBeforeVat)}</td>
                  <td>${taxPercent}</td>
                  <td>${Number(taxAmount) > 0 ? formatPlainAmount(taxAmount) : ''}</td>
                  <td>${formatPlainAmount(netValue)}</td>
                </tr>
                `;
      }).join('')}
              <tr class="empty-row"><td colspan="11"></td></tr>
            </table>

            <div class="bottom-section">
              <div class="bottom-left">
                <div>
                  All cheques and drafts to be made payable to<br/>
                  <strong style="font-style: italic;">${org.name || user?.organizationName || user?.name || 'Your Company'}</strong>,<br/>
                  ${org.bankDetails?.bankName
          ? `<strong style="font-style: italic;">${escapeHtml(org.bankDetails.bankName)}${org.bankDetails.accountName ? ', ' + escapeHtml(org.bankDetails.accountName) : ''}</strong><br/>`
          : '<strong style="font-style: italic;">BANK NAME HERE</strong><br/>'}
                  ${org.bankDetails?.iban
          ? `<strong style="font-style: italic;">IBAN: ${escapeHtml(org.bankDetails.iban)}</strong><br/>`
          : '<strong style="font-style: italic;">IBAN: -</strong><br/>'}
                  ${org.bankDetails?.swiftCode
          ? `<strong style="font-style: italic;">SWIFT: ${escapeHtml(org.bankDetails.swiftCode)}</strong>`
          : '<strong style="font-style: italic;">SWIFT: -</strong>'}
                </div>
                <div style="margin-top: 20px;">
                  DELIVERY : Ex- store, ${org.address?.city || 'Your City'}<br/><br/>
                  ORIGIN OF GOODS :
                </div>
              </div>
              <div class="bottom-right">
                <table class="totals-table">
                  <tr>
                    <td>Value before Discount :</td>
                    <td> ${formatPlainAmount(quotation.subtotal || 0)}</td>
                  </tr>
                  <tr>
                    <td><span style="font-style: italic; font-weight: normal;">Less Discount :</span></td>
                    <td> ${formatPlainAmount(quotation.discountAmount || 0)}</td>
                  </tr>
                  <tr>
                    <td><span style="font-style: italic; font-weight: normal;">Additional charges :</span></td>
                    <td> 0.00</td>
                  </tr>
                  <tr>
                    <td><strong>Sub Total :</strong></td>
                    <td><strong> ${formatPlainAmount((quotation.subtotal || 0) - (quotation.discountAmount || 0))}</strong></td>
                  </tr>
                  <tr>
                    <td>VAT ${quotation.taxRate || '0.00'} % :</td>
                    <td> ${formatPlainAmount(quotation.taxAmount || 0)}</td>
                  </tr>
                  <tr>
                    <td><strong>Grand Total :</strong></td>
                    <td><strong> ${formatPlainAmount(quotation.totalAmount || 0)}</strong></td>
                  </tr>
                </table>
                <div class="word-amount">
                  ${currencyCode} : ${formatPlainAmount(quotation.totalAmount || 0)}
                </div>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-block">
                <div class="sig-line">(Prepared By)</div>
                <div class="sig-meta">ADMIN &nbsp;&nbsp; ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
              </div>
              <div class="sig-block">
                <div class="sig-line">(Approved By)</div>
              </div>
              <div class="sig-block">
                <div class="sig-line">(Received By)</div>
              </div>
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
          {(() => {
            const cust = quotation.isCustomCustomer ? quotation.customCustomer : quotation.customer;
            if (!cust) return <Text style={styles.cardValue}>—</Text>;
            return (
              <>
                <Text style={styles.cardValue}>
                  {cust.name || '—'} {quotation.isCustomCustomer ? <Text style={{fontSize: 12, color: '#64748b'}}>(Custom)</Text> : null}
                </Text>
                {cust.company ? <Text style={styles.cardSubValue}>{cust.company}</Text> : null}
                {cust.type ? <Text style={styles.cardSubValue}>{(cust.type === 'wholesale' ? 'Wholesale' : 'Retail') + ' customer'}</Text> : null}
                {cust.email ? <Text style={styles.cardSubValue}>{cust.email}</Text> : null}
                {cust.phone ? <Text style={styles.cardSubValue}>{cust.phone}</Text> : null}
                {cust.alternatePhone ? <Text style={styles.cardSubValue}>Alt: {cust.alternatePhone}</Text> : null}
                {cust.taxNumber || cust.taxId ? <Text style={styles.cardSubValue}>Tax / VAT: {cust.taxNumber || cust.taxId}</Text> : null}
                {cust.address && [cust.address.street, cust.address.city, cust.address.state].filter(Boolean).length ? (
                  <Text style={[styles.cardSubValue, { marginTop: 8 }]}>
                    {[
                      cust.address.street,
                      [cust.address.city, cust.address.state].filter(Boolean).join(', '),
                      [cust.address.postalCode || cust.address.zipCode, cust.address.country].filter(Boolean).join(' '),
                    ]
                      .filter(Boolean)
                      .join('\n')}
                  </Text>
                ) : null}
                {cust.notes ? <Text style={[styles.cardSubValue, { marginTop: 8, fontStyle: 'italic' }]}>{cust.notes}</Text> : null}
              </>
            );
          })()}
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
              <Text style={[styles.value, { color: '#10b981' }]}>-{formatAmount(quotation.discountAmount || 0, { absolute: true })}</Text>
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

        <View style={{ height: 40 }} />

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
