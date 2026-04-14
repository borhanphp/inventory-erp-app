import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileCheck, Plus, Search } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

export default function InvoiceListScreen({ navigation }) {
  const { formatAmount } = useCurrency();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvoices();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchInvoices = async () => {
    try {
      const { data } = await axiosInstance.get('/custom-invoicing/invoices');
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error('Error fetching invoices', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchInvoices();
  };

  const filteredInvoices = invoices.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const customerName = item.isCustomCustomer
      ? item.customCustomer?.name
      : item.customer?.name;

    return (
      item.invoiceNumber?.toLowerCase().includes(query) ||
      customerName?.toLowerCase().includes(query)
    );
  });

  const getStatusTone = (status) => {
    switch (status) {
      case 'paid':
        return { bg: colors.successSoft, text: colors.success };
      case 'partial':
        return { bg: colors.warningSoft, text: colors.warning };
      case 'sent':
        return { bg: colors.primarySoft, text: colors.primary };
      case 'overdue':
        return { bg: colors.dangerSoft, text: colors.danger };
      case 'draft':
      default:
        return { bg: colors.surfaceStrong, text: colors.textMuted };
    }
  };

  const renderItem = ({ item }) => {
    const tone = getStatusTone(item.status);
    const customerName = item.isCustomCustomer
      ? item.customCustomer?.name
      : item.customer?.name || 'Unknown customer';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('InvoiceDetail', { id: item._id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.text }]}>
              {(item.status || 'draft').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View>
            <Text style={styles.metricLabel}>Total amount</Text>
            <Text style={styles.metricValue}>{formatAmount(item.totalAmount || 0)}</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Balance due</Text>
            <Text style={styles.metricBalance}>{formatAmount(item.balanceAmount || 0)}</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Due date</Text>
            <Text style={styles.metricText}>
              {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
            </Text>
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
          <Text style={styles.headerTitle}>Invoices</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('InvoiceCreate')}>
            <Plus size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCaption}>Monitor billing status, balances, and due dates.</Text>

        <View style={styles.searchShell}>
          <Search size={18} color={colors.textSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by invoice no. or customer"
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
          data={filteredInvoices}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileCheck size={48} color={colors.textSoft} />
              <Text style={styles.emptyStateTitle}>No invoices found</Text>
              <Text style={styles.emptyStateText}>Create an invoice to begin mobile billing management.</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
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
  invoiceNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  customerName: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
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
    color: colors.text,
  },
  metricBalance: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, marginTop: 40 },
  emptyStateTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
