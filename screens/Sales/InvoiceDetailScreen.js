import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Calendar, DollarSign, Package, Edit, Trash2, Download } from 'lucide-react-native';
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

const formatPlainAmount = (amount, decimals = 2) => (Number(amount) || 0).toFixed(decimals);

export default function InvoiceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvoice();
    });
    return unsubscribe;
  }, [navigation, id]);

  const fetchInvoice = async () => {
    try {
      const { data } = await axiosInstance.get(`/custom-invoicing/invoices/${id}`);
      if (data.success) {
        setInvoice(data.data);
      }
    } catch (error) {
      console.error('Error fetching invoice details', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (invoice.status === 'paid') {
      Alert.alert('Cannot Delete', 'Paid invoices cannot be deleted natively.');
      return;
    }

    Alert.alert('Delete Invoice', 'Are you sure you want to delete this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await axiosInstance.delete(`/custom-invoicing/invoices/${id}`);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete invoice');
          }
        }
      }
    ]);
  };

  const handleDownloadPDF = async () => {
    try {
      // Actively fetch full organization data because user.organization might be an unpopulated ObjectId string
      let fullOrg = {};
      try {
        // Use /profile/organization — works purely from the user JWT, no extra middleware needed
        const { data: orgData } = await axiosInstance.get('/profile/organization');
        if (orgData?.success) {
          fullOrg = orgData.data; // response shape: { success, data: org }
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

      const customerName = invoice.isCustomCustomer ? invoice.customCustomer?.name : invoice.customer?.name;
      const customerPhone = invoice.isCustomCustomer ? invoice.customCustomer?.phone : invoice.customer?.phone;

      // Currency: org settings.currency is the authoritative source (what user set in software).
      // invoice.currency.code is a fallback in case it was intentionally overridden per invoice.
      // We do NOT put invoice.currency.code first because the schema defaults it to 'USD',
      // which would always override the org setting.
      const currencyCode = org.settings?.currency || invoice.currency?.code || 'USD';

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #000; margin: 0; }
              
              /* TOP COMPANY INFO */
              .top-header { text-align: center; margin-bottom: 20px; position: relative; }
              .logo-img { position: absolute; left: 0; top: 0; width: 80px; height: 80px; object-fit: contain; }
              .logo-placeholder { position: absolute; left: 0; top: 0; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid #000; color: #000; }
              .company-name { font-size: 26px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
              .company-address { font-size: 13px; margin-bottom: 3px; }
              .company-tax-info { font-size: 13px; margin-bottom: 3px; }
              .company-contact { font-size: 13px; }
              
              /* TITLE ROW */
              .title-row { margin-top: 35px; margin-bottom: 15px; position: relative; display: flex; justify-content: center; align-items: center; }
              .invoice-title { font-size: 22px; font-weight: bold; text-transform: uppercase; }
              .trn-title { position: absolute; right: 0; font-size: 18px; font-weight: bold; }
              
              /* BOXES SECTION */
              .boxes-container { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; width: 100%; }
              
              /* Customer Box */
              .customer-box {
                flex: 1;
                border: 1px solid #000;
                border-radius: 8px;
                padding: 12px 14px;
                font-size: 13px;
                line-height: 1.6;
              }
              .customer-box .bold-name { font-weight: bold; font-size: 14px; display: block; margin-bottom: 4px; }
              .customer-box .bold-text { font-weight: bold; }
              
              /* Details Box */
              .details-box {
                flex: 1;
                border: 1px solid #000;
                border-radius: 8px;
                overflow: hidden;
              }
              .details-table {
                width: 100%;
                border-collapse: collapse;
                height: 100%;
                font-size: 13px;
              }
              .details-table td {
                padding: 8px 12px;
                border-bottom: 1px solid #000;
              }
              .details-table tr:last-child td { border-bottom: none; }
              .details-table td:first-child { border-right: 1px solid #000; font-weight: bold; width: 40%; }
              
              /* MAIN ITEMS TABLE */
              .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .items-table th { border: 1px solid #000; padding: 4px; text-align: center; font-size: 11px; font-weight: bold; }
              .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 6px; font-size: 11px; text-align: center; }
              .items-table td:nth-child(2) { text-align: left; }
              .items-table tr.last-item-row td { border-bottom: 1px solid #000; }
              .items-table tr.empty-row td { height: 100px; border-bottom: 1px solid #000; }
              .items-table tr:last-child td { border-bottom: 1px solid #000; }

              /* BOTTOM TOTALS AREA */
              .bottom-section { display: flex; width: 100%; border: 1px solid #000; margin-top: 0; border-top: none; }
              .bottom-left { flex: 1; padding: 10px; font-size: 11px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: space-between; }
              .bottom-right { width: 320px; }
              .totals-table { width: 100%; border-collapse: collapse; font-size: 12px; }
              .totals-table td { padding: 6px 10px; border-bottom: 1px solid #000; }
              .totals-table td:first-child { text-align: right; border-right: 1px solid #000; width: 65%; }
              .totals-table td:last-child { text-align: right; font-weight: bold; }
              .word-amount { padding: 6px 10px; font-size: 10px; border-top: 1px solid #000;}

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
              <div class="invoice-title">TAX INVOICE</div>
              ${org.taxId || org.vatNumber ? `<div class="trn-title">TRN : ${org.taxId || org.vatNumber}</div>` : ''}
            </div>
            
            <div class="boxes-container">
              <div class="customer-box">
                <div class="bold-name">M/s ${escapeHtml(customerName || 'Customer')}</div>

                ${/* Custom customer address */
        invoice.isCustomCustomer && invoice.customCustomer?.address?.street
          ? `<div class="bold-text">${escapeHtml(
            [invoice.customCustomer.address.street,
            invoice.customCustomer.address.city,
            invoice.customCustomer.address.state,
            invoice.customCustomer.address.zipCode,
            invoice.customCustomer.address.country]
              .filter(Boolean).join(', '))}</div>`
          : ''}

                ${/* DB customer address */
        !invoice.isCustomCustomer && invoice.customer?.address?.street
          ? `<div class="bold-text">${escapeHtml(
            [invoice.customer.address.street,
            invoice.customer.address.city,
            invoice.customer.address.state,
            invoice.customer.address.postalCode,
            invoice.customer.address.country]
              .filter(Boolean).join(', '))}</div>`
          : ''}

                <div class="bold-text" style="margin-top: 8px;">
                  ${customerPhone ? `Tel : ${escapeHtml(customerPhone)} &nbsp;&nbsp;&nbsp;` : ''}
                  ${(invoice.customCustomer?.email || invoice.customer?.email)
          ? `Email : ${escapeHtml(invoice.customCustomer?.email || invoice.customer?.email)}`
          : ''}
                </div>

                ${/* Custom customer TRN */
        invoice.isCustomCustomer && invoice.customCustomer?.taxId
          ? `<div class="bold-text" style="margin-top: 4px;">TRN : ${escapeHtml(invoice.customCustomer.taxId)}</div>`
          : ''}
                ${/* DB customer TRN — model field is taxNumber */
        !invoice.isCustomCustomer && invoice.customer?.taxNumber
          ? `<div class="bold-text" style="margin-top: 4px;">TRN : ${escapeHtml(invoice.customer.taxNumber)}</div>`
          : ''}
              </div>

              <div class="details-box">
                <table class="details-table">
                  <tr>
                    <td>Invoice No :</td>
                    <td>${escapeHtml(invoice.invoiceNumber)}</td>
                  </tr>
                  <tr>
                    <td>Date :</td>
                    <td>${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td>Due Date :</td>
                    <td>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ''}</td>
                  </tr>
                  <tr>
                    <td>Status :</td>
                    <td>${(invoice.status || 'draft').toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td>Currency</td>
                    <td>${currencyCode}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">Payment Terms : 100% Advance payment</div>
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
              ${invoice.lineItems?.map((item, index) => {
            const valueBeforeDiscount = (item.quantity * (item.unitPrice || 0)).toFixed(2);
            const discount = (item.discount || 0).toFixed(2);
            const grossBeforeVat = Math.max(0, parseFloat(valueBeforeDiscount) - parseFloat(discount)).toFixed(2);
            const taxAmount = (item.taxAmount || 0).toFixed(2);
            const taxPercent = (item.taxRate || 0) > 0 ? item.taxRate + '%' : (item.taxPercent || 0) > 0 ? item.taxPercent + '%' : ((parseFloat(taxAmount) / parseFloat(grossBeforeVat)) * 100 || 0).toFixed(0) + '%';
            const netValue = (parseFloat(grossBeforeVat) + parseFloat(taxAmount)).toFixed(2);

            return `
                <tr ${index === invoice.lineItems.length - 1 ? 'class="last-item-row"' : ''}>
                  <td>${index + 1}</td>
                  <td width="40%"><strong>${escapeHtml(item.description || item.product?.name || 'Item')}</strong></td>
                  <td>${escapeHtml(item.unit || '')}</td>
                  <td>${item.quantity.toFixed(2)}</td>
                  <td>${formatPlainAmount(item.unitPrice || 0)}</td>
                  <td>${formatPlainAmount(valueBeforeDiscount)}</td>
                  <td>${item.discount > 0 ? formatPlainAmount(discount) : ''}</td>
                  <td>${grossBeforeVat}</td>
                  <td>${parseFloat(taxAmount) > 0 ? taxPercent : ''}</td>
                  <td>${parseFloat(taxAmount) > 0 ? formatPlainAmount(taxAmount) : ''}</td>
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
          : '<strong style="font-style: italic;">IBAN: —</strong><br/>'}
                  ${org.bankDetails?.swiftCode
          ? `<strong style="font-style: italic;">SWIFT: ${escapeHtml(org.bankDetails.swiftCode)}</strong>`
          : '<strong style="font-style: italic;">SWIFT: —</strong>'}
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
                    <td> ${formatPlainAmount(invoice.subtotal || 0)}</td>
                  </tr>
                  <tr>
                    <td><span style="font-style: italic; font-weight: normal;">Less Discount :</span></td>
                    <td> ${formatPlainAmount(invoice.totalDiscount || 0)}</td>
                  </tr>
                  <tr>
                    <td><span style="font-style: italic; font-weight: normal;">Additional charges :</span></td>
                    <td> 0.00</td>
                  </tr>
                  <tr>
                    <td><strong>Sub Total :</strong></td>
                    <td><strong> ${formatPlainAmount((invoice.subtotal || 0) - (invoice.totalDiscount || 0))}</strong></td>
                  </tr>
                  <tr>
                    <td>VAT ${invoice.taxRate || '5.00'} % :</td>
                    <td> ${formatPlainAmount(invoice.totalTax || 0)}</td>
                  </tr>
                  <tr>
                    <td><strong>Grand Total :</strong></td>
                    <td><strong> ${formatPlainAmount(invoice.totalAmount || 0)}</strong></td>
                  </tr>
                </table>
                <div class="word-amount">
                  ${currencyCode} : ${formatPlainAmount(invoice.totalAmount || 0)}
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
      await Sharing.shareAsync(uri, { dialogTitle: 'Download Invoice PDF' });
    } catch (err) {
      console.error('PDF Error:', err);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'partial': return '#f59e0b';
      case 'sent': return '#3b82f6';
      case 'overdue': return '#ef4444';
      case 'draft': default: return '#64748b';
    }
  };

  if (isLoading && !invoice) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invoice not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customerName = invoice.isCustomCustomer ? invoice.customCustomer?.name : invoice.customer?.name;
  const customerEmail = invoice.isCustomCustomer ? invoice.customCustomer?.email : invoice.customer?.email;
  const customerPhone = invoice.isCustomCustomer ? invoice.customCustomer?.phone : invoice.customer?.phone;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice {invoice.invoiceNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
            {(invoice.status || 'draft').toUpperCase()}
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

          {(invoice.status !== 'paid') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }]}
              onPress={() => navigation.navigate('InvoiceEdit', { id: invoice._id })}
            >
              <Edit size={18} color="#475569" />
              <Text style={[styles.actionText, { color: '#475569' }]}>Edit</Text>
            </TouchableOpacity>
          )}

          {(invoice.status !== 'paid') && (
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
            <Text style={styles.cardTitle}>Bill To</Text>
          </View>
          <Text style={styles.cardValue}>{customerName || '—'}</Text>
          {customerEmail && <Text style={styles.cardSubValue}>{customerEmail}</Text>}
          {customerPhone && <Text style={styles.cardSubValue}>{customerPhone}</Text>}
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color="#64748b" />
            <Text style={styles.cardTitle}>Timeline</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Date:</Text>
            <Text style={styles.value}>{new Date(invoice.invoiceDate).toLocaleDateString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={[styles.value, { color: invoice.isOverdue ? '#ef4444' : '#334155' }]}>
              {new Date(invoice.dueDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={18} color="#64748b" />
            <Text style={styles.cardTitle}>Line Items ({invoice.lineItems?.length || 0})</Text>
          </View>
          {invoice.lineItems?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.description || item.product?.name || 'Item'}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} {item.unit ? item.unit + ' ' : ''}x {formatAmount(item.unitPrice || 0)} {(item.taxAmount || 0) > 0 ? `(+${formatAmount(item.taxAmount || 0)} Tax)` : ''}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatAmount(item.totalAmount || 0)}</Text>
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
            <Text style={styles.value}>{formatAmount(invoice.subtotal || 0)}</Text>
          </View>
          {(invoice.totalDiscount || 0) > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Discount:</Text>
              <Text style={[styles.value, { color: '#10b981' }]}>-{formatAmount(invoice.totalDiscount || 0, { absolute: true })}</Text>
            </View>
          )}
          {(invoice.totalTax || 0) > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Tax:</Text>
              <Text style={styles.value}>{formatAmount(invoice.totalTax || 0)}</Text>
            </View>
          )}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>{formatAmount(invoice.totalAmount || 0)}</Text>
          </View>
          {(invoice.amountPaid || 0) > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: '#059669', marginTop: 4 }]}>Amount Paid:</Text>
              <Text style={[styles.value, { color: '#059669', marginTop: 4 }]}>-{formatAmount(invoice.amountPaid, { absolute: true })}</Text>
            </View>
          )}
          <View style={[styles.row, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>Balance Due:</Text>
            <Text style={styles.balanceValue}>{formatAmount(invoice.balanceAmount || 0)}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />

      </ScrollView>
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
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#334155' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  balanceRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  balanceLabel: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  balanceValue: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
  errorText: { fontSize: 16, color: '#ef4444', marginBottom: 16 },
  backButton: { backgroundColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  backButtonText: { fontWeight: '600', color: '#334155' }
});
