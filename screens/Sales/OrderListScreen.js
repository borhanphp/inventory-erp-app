import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Search, ShoppingCart } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

export default function OrderListScreen({ navigation }) {
  const { formatAmount } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchOrders = async () => {
    try {
      const { data } = await axiosInstance.get('/sales/orders?page=1&limit=50');
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sales orders', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const num = (o.orderNumber || '').toLowerCase();
      const cust = (o.customer?.name || '').toLowerCase();
      return num.includes(q) || cust.includes(q);
    });
  }, [orders, searchQuery]);

  const getStatusTone = (status) => {
    switch (status) {
      case 'delivered':
        return { bg: colors.successSoft, text: colors.success };
      case 'confirmed':
      case 'processing':
        return { bg: colors.primarySoft, text: colors.primary };
      case 'shipped':
        return { bg: '#e0f2fe', text: '#0369a1' };
      case 'cancelled':
        return { bg: colors.dangerSoft, text: colors.danger };
      case 'backordered':
        return { bg: colors.warningSoft, text: colors.warning };
      case 'draft':
      default:
        return { bg: colors.surfaceStrong, text: colors.textMuted };
    }
  };

  const renderItem = ({ item }) => {
    const tone = getStatusTone(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() =>
          navigation.navigate('OrderDetail', {
            id: item._id,
            hasInvoice: !!item.hasInvoice,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>{item.orderNumber || 'Sales order'}</Text>
            <Text style={styles.customerName}>{item.customer?.name || 'Unnamed customer'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.text }]}>
              {(item.status || 'draft').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View>
            <Text style={styles.metricLabel}>Total</Text>
            <Text style={styles.metricValue}>{formatAmount(item.totalAmount || 0)}</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Order date</Text>
            <Text style={styles.metricText}>
              {item.orderDate ? new Date(item.orderDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Invoice</Text>
            <Text style={styles.metricText}>{item.hasInvoice ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales orders</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('OrderCreate')}>
            <Plus size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCaption}>Create and track orders through fulfillment.</Text>
        <View style={styles.searchShell}>
          <Search size={18} color={colors.textSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by number or customer"
            placeholderTextColor={colors.textSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingCart size={48} color={colors.textSoft} />
            <Text style={styles.emptyTitle}>No sales orders</Text>
            <Text style={styles.emptyText}>Pull to refresh or create a new order from the toolbar.</Text>
          </View>
        }
      />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  headerTitle: {
    flex: 1,
    ...typography.sectionTitle,
    fontSize: 22,
  },
  headerCaption: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 4,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
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
  orderNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  customerName: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metricsRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: { padding: 48, alignItems: 'center' },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
