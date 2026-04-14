import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Box, CircleAlert, Download, MapPinned, PackageCheck, Truck, Trash2 } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const statusToneMap = {
  pending: { bg: colors.surfaceStrong, text: colors.textMuted },
  picked: { bg: colors.warningSoft, text: colors.warning },
  packed: { bg: '#efe8ff', text: '#6d3df2' },
  shipped: { bg: colors.primarySoft, text: colors.primary },
  'in-transit': { bg: '#dff4ff', text: '#1170b8' },
  delivered: { bg: colors.successSoft, text: colors.success },
  failed: { bg: colors.dangerSoft, text: colors.danger },
  cancelled: { bg: colors.dangerSoft, text: colors.danger },
};

const nextStatusMap = {
  pending: [{ label: 'Mark Picked', value: 'picked' }, { label: 'Cancel', value: 'cancelled', destructive: true }],
  picked: [{ label: 'Mark Packed', value: 'packed' }, { label: 'Cancel', value: 'cancelled', destructive: true }],
  packed: [{ label: 'Mark Shipped', value: 'shipped' }, { label: 'Cancel', value: 'cancelled', destructive: true }],
  shipped: [{ label: 'Mark Delivered', value: 'delivered' }],
  'in-transit': [{ label: 'Mark Delivered', value: 'delivered' }],
};

const getCustomerName = (delivery) => (
  delivery.customer?.name || delivery.manualCustomer?.name || 'Unknown customer'
);

const getSourceLabel = (delivery) => (
  delivery.saleOrder?.orderNumber || (delivery.sourceType === 'manual' ? 'Manual delivery' : 'N/A')
);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function DeliveryDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [delivery, setDelivery] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDelivery();
    });
    return unsubscribe;
  }, [navigation, id]);

  const fetchDelivery = async () => {
    try {
      const { data } = await axiosInstance.get(`/deliveries/${id}`);
      if (data.success) {
        setDelivery(data.data);
      }
    } catch (error) {
      console.error('Error fetching delivery details', error);
      Alert.alert('Error', 'Failed to load delivery note details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const updateStatus = async (status) => {
    setIsWorking(true);
    try {
      const { data } = await axiosInstance.put(`/deliveries/${id}/status`, { status });
      if (data.success) {
        setDelivery(data.data);
        Alert.alert('Updated', `Delivery note marked as ${status}.`);
      }
    } catch (error) {
      console.error('Error updating delivery status', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update delivery status.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete delivery note', 'Only pending delivery notes can be deleted. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsWorking(true);
          try {
            await axiosInstance.delete(`/deliveries/${id}`);
            navigation.goBack();
          } catch (error) {
            console.error('Error deleting delivery', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete delivery note.');
          } finally {
            setIsWorking(false);
          }
        },
      },
    ]);
  };

  const downloadDocument = async (type) => {
    setIsWorking(true);
    try {
      let fullOrg = {};
      try {
        const { data: orgData } = await axiosInstance.get('/profile/organization');
        if (orgData?.success) {
          fullOrg = orgData.data;
        }
      } catch (error) {
        console.log('Could not fetch org data, falling back to local user context', error);
      }

      const org = fullOrg._id ? fullOrg : (user?.organization || {});
      const companyPhone = org.phone || user?.phone || '';
      const companyEmail = org.email || user?.email || '';
      const companyAddress = [org.address?.street, org.address?.city, org.address?.state, org.address?.zipCode, org.address?.country]
        .filter(Boolean)
        .join(', ');
      const customerName = delivery.customer?.name || delivery.manualCustomer?.name || 'Customer';
      const customerPhone = delivery.shippingAddress?.contactPhone || delivery.customer?.phone || delivery.manualCustomer?.phone || '';
      const customerEmail = delivery.customer?.email || delivery.manualCustomer?.email || '';
      const customerCompany = delivery.manualCustomer?.company || delivery.customer?.company || '';
      const shippingAddress = [
        delivery.shippingAddress?.street,
        delivery.shippingAddress?.city,
        delivery.shippingAddress?.state,
        delivery.shippingAddress?.postalCode,
        delivery.shippingAddress?.country,
      ].filter(Boolean).join(', ');
      const generatedAt = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      const itemsHtml = (delivery.items || []).map((item, index) => {
        const packageRefs = (item.packageNumbers || []).filter(Boolean).join(', ');
        const detailText = [
          item.description,
          item.notes,
          item.customFields?.length
            ? item.customFields.map((cf) => `${cf.key}: ${cf.value}`).join(', ')
            : '',
        ].filter(Boolean).join(' | ');

        return `
          <tr ${index === (delivery.items || []).length - 1 ? 'class="last-item-row"' : ''}>
            <td>${index + 1}</td>
            <td width="34%"><strong>${escapeHtml(item.product?.name || item.productName || 'Item')}</strong></td>
            <td>${escapeHtml(detailText || '-')}</td>
            <td>${escapeHtml(packageRefs || '-')}</td>
            <td>${Number(item.quantity || 0).toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const packageRows = Array.isArray(delivery.packages) && delivery.packages.length
        ? delivery.packages.map((pkg, pkgIndex) => {
            const packageDetails = [
              pkg.weight?.value ? `${pkg.weight.value} ${pkg.weight.unit || 'kg'}` : '',
              pkg.dimensions?.length ? `${pkg.dimensions.length}x${pkg.dimensions.width}x${pkg.dimensions.height} ${pkg.dimensions.unit || 'cm'}` : '',
            ].filter(Boolean).join(' | ');

            const contents = (pkg.items || []).map((item) =>
              `${escapeHtml(item.product?.name || item.productName || 'Item')} x ${Number(item.quantity || 0).toFixed(2)}`
            ).join('<br/>') || '-';

            return `
              <tr ${pkgIndex === delivery.packages.length - 1 ? 'class="last-item-row"' : ''}>
                <td>${pkgIndex + 1}</td>
                <td><strong>${escapeHtml(pkg.packageNumber || `PKG-${pkgIndex + 1}`)}</strong></td>
                <td>${escapeHtml(packageDetails || '-')}</td>
                <td>${contents}</td>
              </tr>
            `;
          }).join('')
        : (delivery.items || []).map((item, index) => `
            <tr ${index === (delivery.items || []).length - 1 ? 'class="last-item-row"' : ''}>
              <td>${index + 1}</td>
              <td><strong>${escapeHtml((item.packageNumbers || []).filter(Boolean).join(', ') || `PKG-${index + 1}`)}</strong></td>
              <td>-</td>
              <td>${escapeHtml(item.product?.name || item.productName || 'Item')} x ${Number(item.quantity || 0).toFixed(2)}</td>
            </tr>
          `).join('');

      const summaryHtml = type === 'challan'
        ? `
          <table class="totals-table">
            <tr><td>Delivery No :</td><td>${escapeHtml(delivery.deliveryNumber || '-')}</td></tr>
            <tr><td>Order Ref :</td><td>${escapeHtml(delivery.saleOrder?.orderNumber || 'Manual delivery')}</td></tr>
            <tr><td>Warehouse :</td><td>${escapeHtml(delivery.warehouse?.name || 'N/A')}</td></tr>
            <tr><td>Shipping Method :</td><td>${escapeHtml(delivery.shippingMethod || '-')}</td></tr>
            <tr><td>Carrier :</td><td>${escapeHtml(delivery.shippingCarrier || '-')}</td></tr>
            <tr><td>Tracking No :</td><td>${escapeHtml(delivery.trackingNumber || '-')}</td></tr>
            <tr><td><strong>Total Items :</strong></td><td><strong>${(delivery.items || []).length}</strong></td></tr>
          </table>
        `
        : `
          <table class="totals-table">
            <tr><td>Packing Slip No :</td><td>${escapeHtml(delivery.deliveryNumber || '-')}</td></tr>
            <tr><td>Total Packages :</td><td>${Array.isArray(delivery.packages) && delivery.packages.length ? delivery.packages.length : Math.max(1, (delivery.items || []).length)}</td></tr>
            <tr><td>Total Qty :</td><td>${(delivery.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toFixed(2)}</td></tr>
            <tr><td>Carrier :</td><td>${escapeHtml(delivery.shippingCarrier || '-')}</td></tr>
            <tr><td>Tracking No :</td><td>${escapeHtml(delivery.trackingNumber || '-')}</td></tr>
            <tr><td>Warehouse :</td><td>${escapeHtml(delivery.warehouse?.name || 'N/A')}</td></tr>
          </table>
        `;

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
              .doc-title { font-size: 22px; font-weight: bold; text-transform: uppercase; }
              .doc-meta { position: absolute; right: 0; font-size: 14px; font-weight: bold; }
              .boxes-container { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; width: 100%; }
              .customer-box { flex: 1; border: 1px solid #000; border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.6; }
              .customer-box .bold-name { font-weight: bold; font-size: 14px; display: block; margin-bottom: 4px; }
              .customer-box .bold-text { font-weight: bold; }
              .details-box { flex: 1; border: 1px solid #000; border-radius: 8px; overflow: hidden; }
              .details-table { width: 100%; border-collapse: collapse; height: 100%; font-size: 13px; }
              .details-table td { padding: 8px 12px; border-bottom: 1px solid #000; }
              .details-table tr:last-child td { border-bottom: none; }
              .details-table td:first-child { border-right: 1px solid #000; font-weight: bold; width: 42%; }
              .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .items-table th { border: 1px solid #000; padding: 6px; text-align: center; font-size: 11px; font-weight: bold; }
              .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 6px; font-size: 11px; text-align: center; vertical-align: top; }
              .items-table td:nth-child(2), .items-table td:nth-child(3), .items-table td:nth-child(4) { text-align: left; }
              .bottom-section { display: flex; width: 100%; border: 1px solid #000; border-top: none; margin-top: 0; }
              .bottom-left { flex: 1; padding: 10px; font-size: 11px; border-right: 1px solid #000; }
              .bottom-right { width: 320px; }
              .totals-table { width: 100%; border-collapse: collapse; font-size: 12px; }
              .totals-table td { padding: 6px 10px; border-bottom: 1px solid #000; }
              .totals-table td:first-child { text-align: right; border-right: 1px solid #000; width: 60%; }
              .totals-table td:last-child { text-align: right; font-weight: bold; }
              .signatures { display: flex; justify-content: space-between; margin-top: 36px; font-size: 13px; font-weight: bold; text-align: center; }
              .sig-block { flex: 1; }
              .sig-line { text-decoration: underline; margin-bottom: 6px; }
              .sig-meta { font-size: 10px; font-weight: normal; color: #555; text-align: left; padding-left: 10%; }
            </style>
          </head>
          <body>
            <div class="top-header">
              ${org.logo ? `<img src="${org.logo}" alt="Company Logo" class="logo-img" />` : `<div class="logo-placeholder">LOGO</div>`}
              <div class="company-name">${escapeHtml(org.name || user?.organizationName || user?.name || 'Company Details')}</div>
              ${companyAddress ? `<div class="company-address">${escapeHtml(companyAddress)}</div>` : ''}
              ${(org.taxId || org.vatNumber || org.registrationNumber) ? `<div class="company-tax-info">${escapeHtml([org.taxId ? `TRN: ${org.taxId}` : '', org.vatNumber ? `VAT: ${org.vatNumber}` : '', org.registrationNumber ? `Reg: ${org.registrationNumber}` : ''].filter(Boolean).join(' | '))}</div>` : ''}
              <div class="company-contact">
                ${companyPhone ? `Tel : ${escapeHtml(companyPhone)}` : ''}
                ${companyPhone && companyEmail ? ', &nbsp;&nbsp;' : ''}
                ${companyEmail ? `Email : ${escapeHtml(companyEmail)}` : ''}
              </div>
            </div>

            <div class="title-row">
              <div class="doc-title">${type === 'challan' ? 'DELIVERY CHALLAN' : 'PACKING SLIP'}</div>
              <div class="doc-meta">${escapeHtml(delivery.deliveryNumber || '-')}</div>
            </div>

            <div class="boxes-container">
              <div class="customer-box">
                <div class="bold-name">M/s ${escapeHtml(customerName)}</div>
                ${customerCompany ? `<div class="bold-text">${escapeHtml(customerCompany)}</div>` : ''}
                ${shippingAddress ? `<div class="bold-text">${escapeHtml(shippingAddress)}</div>` : ''}
                <div class="bold-text" style="margin-top: 8px;">
                  ${customerPhone ? `Tel : ${escapeHtml(customerPhone)} &nbsp;&nbsp;&nbsp;` : ''}
                  ${customerEmail ? `Email : ${escapeHtml(customerEmail)}` : ''}
                </div>
              </div>

              <div class="details-box">
                <table class="details-table">
                  <tr><td>${type === 'challan' ? 'Delivery No' : 'Packing Slip No'} :</td><td>${escapeHtml(delivery.deliveryNumber || '-')}</td></tr>
                  <tr><td>Date :</td><td>${delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString() : ''}</td></tr>
                  <tr><td>Source Ref :</td><td>${escapeHtml(delivery.saleOrder?.orderNumber || 'Manual delivery')}</td></tr>
                  <tr><td>Status :</td><td>${escapeHtml((delivery.status || 'pending').toUpperCase())}</td></tr>
                  <tr><td>Warehouse :</td><td>${escapeHtml(delivery.warehouse?.name || 'N/A')}</td></tr>
                </table>
              </div>
            </div>

            <table class="items-table">
              <tr>
                ${type === 'challan'
                  ? '<th>S.N</th><th>Description</th><th>Notes / Attributes</th><th>Package Ref</th><th>Qty</th>'
                  : '<th>S.N</th><th>Package</th><th>Package Details</th><th>Contents</th>'}
              </tr>
              ${type === 'challan' ? itemsHtml : packageRows}
            </table>

            <div class="bottom-section">
              <div class="bottom-left">
                <div><strong>${type === 'challan' ? 'Delivery Information' : 'Packing Information'}</strong></div>
                <div style="margin-top: 10px;">Shipping Method : ${escapeHtml(delivery.shippingMethod || '-')}</div>
                <div>Carrier : ${escapeHtml(delivery.shippingCarrier || '-')}</div>
                <div>Tracking Number : ${escapeHtml(delivery.trackingNumber || '-')}</div>
                ${delivery.specialInstructions ? `<div style="margin-top: 10px;"><strong>Special Instructions :</strong><br/>${escapeHtml(delivery.specialInstructions)}</div>` : ''}
              </div>
              <div class="bottom-right">
                ${summaryHtml}
              </div>
            </div>

            <div class="signatures">
              <div class="sig-block">
                <div class="sig-line">(Prepared By)</div>
                <div class="sig-meta">ADMIN &nbsp;&nbsp; ${escapeHtml(generatedAt)}</div>
              </div>
              <div class="sig-block">
                <div class="sig-line">(Checked By)</div>
              </div>
              <div class="sig-block">
                <div class="sig-line">(Received By)</div>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        dialogTitle: type === 'challan' ? 'Download Delivery Challan PDF' : 'Download Packing Slip PDF',
      });
    } catch (error) {
      console.error(`Error downloading ${type}`, error);
      Alert.alert('Error', `Failed to download ${type === 'challan' ? 'delivery note' : 'packing slip'}.`);
    } finally {
      setIsWorking(false);
    }
  };

  if (isLoading && !delivery) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Delivery note not found</Text>
      </View>
    );
  }

  const tone = statusToneMap[delivery.status] || statusToneMap.pending;
  const availableActions = nextStatusMap[delivery.status] || [];
  const address = delivery.shippingAddress || {};
  const addressLines = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{delivery.deliveryNumber}</Text>
            <Text style={styles.headerCaption}>{getCustomerName(delivery)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.text }]}>
              {(delivery.status || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchDelivery(); }} tintColor={colors.primary} />
        }
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Source</Text>
              <Text style={styles.summaryValue}>{getSourceLabel(delivery)}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Warehouse</Text>
              <Text style={styles.summaryValue}>{delivery.warehouse?.name || 'N/A'}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Shipping method</Text>
              <Text style={styles.summaryValue}>{delivery.shippingMethod || 'N/A'}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Scheduled</Text>
              <Text style={styles.summaryValue}>
                {delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary, isWorking && styles.actionBtnDisabled]}
              disabled={isWorking}
              onPress={() => downloadDocument('challan')}
            >
              <View style={styles.actionBtnInner}>
                <Download size={16} color={colors.primaryDark} />
                <Text style={styles.actionBtnText}>Delivery Note</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary, isWorking && styles.actionBtnDisabled]}
              disabled={isWorking}
              onPress={() => downloadDocument('packing-slip')}
            >
              <View style={styles.actionBtnInner}>
                <Download size={16} color={colors.primaryDark} />
                <Text style={styles.actionBtnText}>Packing Slip</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {availableActions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionRow}>
              {availableActions.map((action) => (
                <TouchableOpacity
                  key={action.value}
                  style={[
                    styles.actionBtn,
                    action.destructive ? styles.actionBtnDanger : styles.actionBtnPrimary,
                    isWorking && styles.actionBtnDisabled,
                  ]}
                  disabled={isWorking}
                  onPress={() => updateStatus(action.value)}
                >
                  <Text style={[styles.actionBtnText, action.destructive && styles.actionBtnTextDanger]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {delivery.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.iconActionBtn, isWorking && styles.actionBtnDisabled]}
                  disabled={isWorking}
                  onPress={handleDelete}
                >
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MapPinned size={18} color={colors.textMuted} />
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </View>
          <Text style={styles.bodyText}>{addressLines.join(', ') || 'No shipping address available.'}</Text>
          {delivery.manualCustomer?.company ? <Text style={styles.subtleText}>Company: {delivery.manualCustomer.company}</Text> : null}
          {delivery.manualCustomer?.email ? <Text style={styles.subtleText}>Email: {delivery.manualCustomer.email}</Text> : null}
          {address.contactName ? <Text style={styles.subtleText}>Contact: {address.contactName}</Text> : null}
          {address.contactPhone ? <Text style={styles.subtleText}>Phone: {address.contactPhone}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Box size={18} color={colors.textMuted} />
            <Text style={styles.sectionTitle}>Items</Text>
          </View>
          {delivery.items?.map((item, index) => (
            <View key={`${item._id || index}`} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.product?.name || item.productName || 'Item'}</Text>
                {item.description ? <Text style={styles.subtleText}>{item.description}</Text> : null}
              </View>
              <Text style={styles.itemQty}>{item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <PackageCheck size={18} color={colors.textMuted} />
            <Text style={styles.sectionTitle}>Status History</Text>
          </View>
          {(delivery.statusHistory || []).length === 0 ? (
            <Text style={styles.bodyText}>No status history recorded yet.</Text>
          ) : (
            delivery.statusHistory.map((entry, index) => (
              <View key={`${entry._id || index}`} style={styles.timelineRow}>
                <CircleAlert size={16} color={colors.primary} />
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{(entry.status || '').toUpperCase()}</Text>
                  <Text style={styles.timelineText}>{new Date(entry.timestamp).toLocaleString()}</Text>
                  {entry.note ? <Text style={styles.timelineText}>{entry.note}</Text> : null}
                  {entry.location ? <Text style={styles.timelineText}>Location: {entry.location}</Text> : null}
                </View>
              </View>
            ))
          )}
        </View>

        {delivery.specialInstructions ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Truck size={18} color={colors.textMuted} />
              <Text style={styles.sectionTitle}>Special Instructions</Text>
            </View>
            <Text style={styles.bodyText}>{delivery.specialInstructions}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { ...typography.sectionTitle, fontSize: 22 },
  headerCaption: { marginTop: 4, fontSize: 14, color: colors.textMuted },
  statusBadge: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitle: { ...typography.sectionTitle, fontSize: 18 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  summaryCell: { width: '50%' },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: colors.textSoft, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    minHeight: 42,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: { backgroundColor: colors.primarySoft },
  actionBtnDanger: { backgroundColor: colors.dangerSoft },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtnTextDanger: { color: colors.danger },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
  bodyText: { fontSize: 14, lineHeight: 21, color: colors.text },
  subtleText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemLeft: { flex: 1, paddingRight: spacing.md },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemQty: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  timelineRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  timelineBody: { flex: 1 },
  timelineTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  timelineText: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
});
