import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Package,
  User,
  Warehouse as WarehouseIcon,
  FileText,
  Trash2,
  Edit3,
  RefreshCw,
  Send,
  Receipt,
} from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

async function findInvoiceIdForOrder(orderId) {
  try {
    const { data } = await axiosInstance.get('/sales/invoices?limit=500&page=1');
    if (!data.success) return null;
    const list = data.data || [];
    const hit = list.find((inv) => {
      const so = inv.saleOrder;
      const sid = so && typeof so === 'object' ? so._id || so : so;
      return sid && String(sid) === String(orderId);
    });
    return hit?._id || null;
  } catch {
    return null;
  }
}

export default function OrderDetailScreen({ route, navigation }) {
  const { id, hasInvoice: hasInvoiceParam } = route.params || {};
  const { formatAmount } = useCurrency();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data } = await axiosInstance.get(`/sales/orders/${id}`);
      if (data.success) setOrder(data.data);
    } catch (error) {
      console.error('Error fetching sales order', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchOrder();
    });
    return unsub;
  }, [navigation, id]);

  useEffect(() => {
    if (!order?._id) return;
    let cancelled = false;
    (async () => {
      const invId = await findInvoiceIdForOrder(order._id);
      if (!cancelled) setLinkedInvoiceId(invId);
    })();
    return () => {
      cancelled = true;
    };
  }, [order?._id, order?.updatedAt]);

  const hasInvoice = !!linkedInvoiceId || !!hasInvoiceParam;

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await fetchOrder();
      const invId = await findInvoiceIdForOrder(id);
      setLinkedInvoiceId(invId);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (order?.status !== 'draft') {
      Alert.alert('Not allowed', 'Only draft orders can be deleted.');
      return;
    }
    Alert.alert('Delete order', 'This removes the draft sales order permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await axiosInstance.delete(`/sales/orders/${id}`);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || error.message || 'Request failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const patchStatus = (status) =>
    run(async () => {
      await axiosInstance.patch(`/sales/orders/${id}/status`, { status });
    });

  const confirmOrder = () => {
    Alert.alert('Confirm order', 'Move this order to confirmed? Stock reservation rules apply on the server.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => patchStatus('confirmed') },
    ]);
  };

  const onCancelPress = () => {
    if (['delivered', 'cancelled'].includes(order?.status)) return;
    Alert.alert('Cancel order', 'Cancel this order and release reserved stock where applicable?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await axiosInstance.patch(`/sales/orders/${id}/cancel`, {});
          }),
      },
    ]);
  };

  const generateInvoice = () =>
    run(async () => {
      const { data } = await axiosInstance.post(`/sales/orders/${id}/generate-invoice`);
      if (data.success) {
        const inv = data.data?.invoice;
        if (inv?._id) setLinkedInvoiceId(inv._id);
        Alert.alert('Invoice created', inv?.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : 'Invoice generated.');
      }
    });

  const sendOrder = () =>
    run(async () => {
      await axiosInstance.patch(`/sales/orders/${id}/send`);
    });

  const openInvoice = () => {
    if (linkedInvoiceId) {
      navigation.navigate('SalesInvoiceDetail', { id: linkedInvoiceId });
    }
  };

  if (isLoading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Order not found.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = order.status || 'draft';
  const canEdit = status === 'draft';
  const canDelete = status === 'draft';
  const canConfirm = status === 'draft';
  const canGenInvoice =
    ['confirmed', 'processing', 'shipped', 'delivered'].includes(status) && !linkedInvoiceId && !hasInvoiceParam;
  const canSend = status === 'confirmed';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Sales order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.orderNo}>{order.orderNumber}</Text>
          <View style={[styles.badge, { backgroundColor: colors.surfaceStrong }]}>
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>{status.toUpperCase()}</Text>
          </View>
          <Text style={styles.total}>{formatAmount(order.totalAmount || 0)}</Text>
          <Text style={styles.caption}>
            {order.orderDate ? `Order date ${new Date(order.orderDate).toLocaleString()}` : ''}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowLabel}>
            <User size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Customer</Text>
          </View>
          <Text style={styles.body}>{order.customer?.name || '—'}</Text>
          {order.customer?.phone ? <Text style={styles.muted}>{order.customer.phone}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.rowLabel}>
            <WarehouseIcon size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Warehouse</Text>
          </View>
          <Text style={styles.body}>{order.warehouse?.name || '—'}</Text>
        </View>

        {order.notes ? (
          <View style={styles.card}>
            <View style={styles.rowLabel}>
              <FileText size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.body}>{order.notes}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.rowLabel}>
            <Package size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Line items</Text>
          </View>
          {(order.items || []).map((line, idx) => (
            <View key={idx} style={styles.line}>
              <Text style={styles.lineTitle}>
                {line.product?.name || line.productName || 'Product'}
              </Text>
              <Text style={styles.lineMeta}>
                Qty {line.quantity} × ${(line.unitPrice || 0).toFixed(2)} · Line $
                {(line.totalPrice != null
                  ? line.totalPrice
                  : (line.quantity || 0) * (line.unitPrice || 0)
                ).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {canEdit ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionSecondary]}
              disabled={busy}
              onPress={() => navigation.navigate('OrderEdit', { id })}
            >
              <Edit3 size={18} color={colors.primary} />
              <Text style={styles.actionSecondaryText}>Edit details</Text>
            </TouchableOpacity>
          ) : null}

          {canConfirm ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} disabled={busy} onPress={confirmOrder}>
              <RefreshCw size={18} color="#fff" />
              <Text style={styles.actionPrimaryText}>Confirm order</Text>
            </TouchableOpacity>
          ) : null}

          {canSend ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} disabled={busy} onPress={sendOrder}>
              <Send size={18} color="#fff" />
              <Text style={styles.actionPrimaryText}>Send to customer</Text>
            </TouchableOpacity>
          ) : null}

          {(linkedInvoiceId || hasInvoice) ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionSecondary]}
              disabled={busy || !linkedInvoiceId}
              onPress={openInvoice}
            >
              <Receipt size={18} color={colors.primary} />
              <Text style={styles.actionSecondaryText}>
                {linkedInvoiceId ? 'View invoice' : 'Syncing invoice…'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {canGenInvoice ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} disabled={busy} onPress={generateInvoice}>
              <Receipt size={18} color="#fff" />
              <Text style={styles.actionPrimaryText}>Generate invoice</Text>
            </TouchableOpacity>
          ) : null}

          {['draft', 'confirmed', 'processing', 'shipped', 'backordered'].includes(status) ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionDangerOutline]} disabled={busy} onPress={onCancelPress}>
              <Text style={styles.actionDangerText}>Cancel order</Text>
            </TouchableOpacity>
          ) : null}

          {canDelete ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionDangerOutline]} disabled={busy} onPress={confirmDelete}>
              <Trash2 size={18} color={colors.danger} />
              <Text style={styles.actionDangerText}>Delete draft</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topTitle: { ...typography.sectionTitle, fontSize: 18 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  orderNo: { fontSize: 22, fontWeight: '800', color: colors.text },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  badgeText: { fontSize: 12, fontWeight: '800' },
  total: { marginTop: spacing.md, fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  caption: { marginTop: 6, color: colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { ...typography.sectionTitle, fontSize: 16 },
  body: { fontSize: 15, color: colors.text, fontWeight: '600' },
  muted: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  line: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  lineMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionSecondaryText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  actionDangerOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  actionDangerText: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
