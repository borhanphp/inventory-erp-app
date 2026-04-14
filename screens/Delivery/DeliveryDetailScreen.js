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
import { ArrowLeft, Box, CircleAlert, MapPinned, PackageCheck, Truck, Trash2 } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
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

export default function DeliveryDetailScreen({ route, navigation }) {
  const { id } = route.params;
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
