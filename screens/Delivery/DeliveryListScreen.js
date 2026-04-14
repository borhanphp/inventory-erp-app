import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Search, Truck } from 'lucide-react-native';
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

const getCustomerName = (delivery) => (
  delivery.customer?.name || delivery.manualCustomer?.name || 'Unknown customer'
);

const getSourceLabel = (delivery) => (
  delivery.saleOrder?.orderNumber || (delivery.sourceType === 'manual' ? 'Manual delivery' : 'N/A')
);

export default function DeliveryListScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDeliveries();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchDeliveries = async () => {
    try {
      const { data } = await axiosInstance.get('/deliveries?page=1&limit=50');
      if (data.success) {
        setDeliveries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching deliveries', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return deliveries;

    return deliveries.filter((delivery) => {
      return (
        delivery.deliveryNumber?.toLowerCase().includes(query) ||
        getCustomerName(delivery).toLowerCase().includes(query) ||
        getSourceLabel(delivery).toLowerCase().includes(query)
      );
    });
  }, [deliveries, searchQuery]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDeliveries();
  };

  const renderItem = ({ item }) => {
    const tone = statusToneMap[item.status] || statusToneMap.pending;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('DeliveryDetail', { id: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.deliveryNumber}>{item.deliveryNumber || 'Pending number'}</Text>
            <Text style={styles.customerName}>{getCustomerName(item)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.text }]}>
              {(item.status || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View>
            <Text style={styles.metricLabel}>Source</Text>
            <Text style={styles.metricText}>{getSourceLabel(item)}</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Scheduled date</Text>
            <Text style={styles.metricText}>
              {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Shipping</Text>
            <Text style={styles.metricText}>{item.shippingMethod || 'N/A'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Notes</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('DeliveryCreate')}>
            <Plus size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCaption}>Track outbound shipments and proof-of-delivery workflow.</Text>

        <View style={styles.searchShell}>
          <Search size={18} color={colors.textSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by delivery no., customer, or order"
            placeholderTextColor={colors.textSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Truck size={48} color={colors.textSoft} />
              <Text style={styles.emptyStateTitle}>No delivery notes found</Text>
              <Text style={styles.emptyStateText}>
                Create from a sales order or build a manual delivery note to start shipment tracking.
              </Text>
            </View>
          }
        />
      )}
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
  headerTitle: { flex: 1, ...typography.sectionTitle, fontSize: 22 },
  headerCaption: { marginTop: 10, color: colors.textMuted, fontSize: 14 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    marginTop: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cardTitleWrap: { flex: 1 },
  deliveryNumber: { fontSize: 17, fontWeight: '800', color: colors.text },
  customerName: { marginTop: 4, fontSize: 14, color: colors.textMuted },
  statusBadge: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  metricsRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metricLabel: { fontSize: 12, fontWeight: '700', color: colors.textSoft, marginBottom: 4 },
  metricText: { fontSize: 13, fontWeight: '600', color: colors.text },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, marginTop: 40 },
  emptyStateTitle: { marginTop: spacing.md, fontSize: 18, fontWeight: '800', color: colors.text },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
