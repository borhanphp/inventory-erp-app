import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, User, Calendar, DollarSign } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

export default function SalesInvoiceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { formatAmount } = useCurrency();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchInvoice();
    });
    return unsub;
  }, [navigation, id]);

  const fetchInvoice = async () => {
    try {
      const { data } = await axiosInstance.get(`/sales/invoices/${id}`);
      if (data.success) setInvoice(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !invoice) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Invoice not found.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = (invoice.status || 'draft').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Sales invoice</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.invoiceNo}>{invoice.invoiceNumber}</Text>
          <View style={[styles.badge, { backgroundColor: colors.surfaceStrong }]}>
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>{st}</Text>
          </View>
          <Text style={styles.total}>{formatAmount(invoice.totalAmount || 0)}</Text>
          <Text style={styles.caption}>Balance due {formatAmount(invoice.balanceAmount ?? invoice.totalAmount ?? 0)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowLabel}>
            <User size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Customer</Text>
          </View>
          <Text style={styles.body}>{invoice.customer?.name || '—'}</Text>
        </View>

        {invoice.saleOrder?.orderNumber ? (
          <View style={styles.card}>
            <View style={styles.rowLabel}>
              <Calendar size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Sales order</Text>
            </View>
            <Text style={styles.body}>{invoice.saleOrder.orderNumber}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.rowLabel}>
            <Calendar size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Dates</Text>
          </View>
          <Text style={styles.body}>
            Invoice {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '—'}
          </Text>
          <Text style={styles.muted}>
            Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowLabel}>
            <Package size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Line items</Text>
          </View>
          {(invoice.items || []).map((line, idx) => (
            <View key={idx} style={styles.line}>
              <Text style={styles.lineTitle}>{line.product?.name || 'Product'}</Text>
              <Text style={styles.lineMeta}>
                Qty {line.quantity} × {formatAmount(line.unitPrice || 0)} · {formatAmount(line.totalPrice || 0)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.rowLabel}>
            <DollarSign size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Totals</Text>
          </View>
          <Text style={styles.body}>Subtotal {formatAmount(invoice.subtotal || 0)}</Text>
          <Text style={styles.muted}>Tax {formatAmount(invoice.taxAmount || 0)}</Text>
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
  invoiceNo: { fontSize: 22, fontWeight: '800', color: colors.text },
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
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
