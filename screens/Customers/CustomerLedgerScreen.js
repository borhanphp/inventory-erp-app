import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return '—';
  }
}

export default function CustomerLedgerScreen({ route, navigation }) {
  const { id, name } = route.params || {};
  const { formatAmount } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const { data } = await axiosInstance.get(
        `/accounts-receivable/customers/${id}/statement`
      );
      if (data.success) {
        setStatement(data.data);
      } else {
        setError(data.message || 'Could not load ledger');
      }
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || e.message || 'Could not load ledger');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    load();
  };

  const entries = useMemo(() => {
    if (!statement) return [];
    const inv = (statement.invoices || []).map((x) => ({
      key: `inv-${x._id}`,
      kind: 'invoice',
      date: new Date(x.invoiceDate || x.createdAt),
      title: `Invoice ${x.invoiceNumber || ''}`,
      sub: x.status ? `Status: ${x.status}` : '',
      debit: Number(x.totalAmount) || 0,
      credit: 0,
      balance: Number(x.balanceAmount) || 0,
    }));
    const pay = (statement.payments || []).map((x) => ({
      key: `pay-${x._id}`,
      kind: 'payment',
      date: new Date(x.paymentDate || x.createdAt),
      title: 'Payment',
      sub: [x.paymentMethod, x.invoice?.invoiceNumber ? `Inv ${x.invoice.invoiceNumber}` : '', x.reference]
        .filter(Boolean)
        .join(' · '),
      debit: 0,
      credit: Number(x.amount) || 0,
      balance: null,
    }));
    return [...inv, ...pay].sort((a, b) => b.date - a.date);
  }, [statement]);

  const renderItem = ({ item }) => {
    const isInv = item.kind === 'invoice';
    return (
      <View style={styles.lineCard}>
        <View style={styles.lineTop}>
          {isInv ? (
            <ArrowUpCircle size={20} color={colors.warning} />
          ) : (
            <ArrowDownCircle size={20} color={colors.success} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.lineTitle}>{item.title}</Text>
            {item.sub ? <Text style={styles.lineSub}>{item.sub}</Text> : null}
            <Text style={styles.lineDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.amountRow}>
          {isInv ? (
            <Text style={styles.debit}>{formatAmount(item.debit, { showPlus: true })}</Text>
          ) : (
            <Text style={styles.credit}>-{formatAmount(item.credit, { absolute: true })}</Text>
          )}
          {isInv && item.balance != null ? (
            <Text style={styles.bal}>Balance {formatAmount(item.balance)}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (isLoading && !statement && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !statement) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Ledger</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const balance = statement?.currentBalance ?? 0;
  const period = statement?.period;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Ledger
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryInner}>
          <Wallet size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Outstanding balance</Text>
            <Text style={styles.summaryValue}>{formatAmount(Number(balance))}</Text>
            {name ? <Text style={styles.summaryName}>{name}</Text> : null}
            {period?.startDate && period?.endDate ? (
              <Text style={styles.summaryPeriod}>
                Period {formatDate(period.startDate)} — {formatDate(period.endDate)}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.summaryHint}>
          Invoices and payments from accounts receivable (sales invoices). Default range is the last 90 days.
        </Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No invoice or payment activity in this period.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
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
  topTitle: { ...typography.sectionTitle, fontSize: 18, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  summary: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  summaryInner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  summaryValue: { fontSize: 26, fontWeight: '800', color: colors.primaryDark, marginTop: 4 },
  summaryName: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 6 },
  summaryPeriod: { fontSize: 12, color: colors.textSoft, marginTop: 6 },
  summaryHint: { fontSize: 12, color: colors.textSoft, marginTop: spacing.md, lineHeight: 18 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  lineCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lineTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  lineSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  lineDate: { fontSize: 12, color: colors.textSoft, marginTop: 6 },
  amountRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debit: { fontSize: 16, fontWeight: '800', color: colors.warning },
  credit: { fontSize: 16, fontWeight: '800', color: colors.success },
  bal: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  errText: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retry: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
