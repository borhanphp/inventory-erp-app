import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Plus } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

export default function QuotationListScreen({ navigation }) {
  const { formatAmount } = useCurrency();
  const [quotations, setQuotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchQuotations();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchQuotations = async () => {
    try {
      const { data } = await axiosInstance.get('/quotations?page=1&limit=20');
      if (data.success) {
        setQuotations(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching quotations', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchQuotations();
  };

  const getStatusTone = (status) => {
    switch (status) {
      case 'accepted':
        return { bg: colors.successSoft, text: colors.success };
      case 'rejected':
        return { bg: colors.dangerSoft, text: colors.danger };
      case 'sent':
        return { bg: colors.primarySoft, text: colors.primary };
      case 'converted':
        return { bg: '#ede9fe', text: '#6d28d9' };
      case 'expired':
        return { bg: '#ffedd5', text: '#c2410c' };
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
        onPress={() => navigation.navigate('QuotationDetail', { id: item._id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.quoteNumber}>{item.quotationNumber || 'Pending number'}</Text>
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
            <Text style={styles.metricLabel}>Estimated value</Text>
            <Text style={styles.metricValue}>{formatAmount(item.totalAmount || 0)}</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Created</Text>
            <Text style={styles.metricText}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Valid until</Text>
            <Text style={styles.metricText}>
              {item.validUntil ? new Date(item.validUntil).toLocaleDateString() : 'N/A'}
            </Text>
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
          <Text style={styles.headerTitle}>Quotations</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('QuotationCreate')}>
            <Plus size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCaption}>Prepare, review, and share sales estimates.</Text>
      </View>

      <FlatList
        data={quotations}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={48} color={colors.textSoft} />
            <Text style={styles.emptyTitle}>No quotations available</Text>
            <Text style={styles.emptyText}>Create your first quotation to start the mobile sales workflow.</Text>
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
  quoteNumber: {
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
    maxWidth: 260,
  },
});
