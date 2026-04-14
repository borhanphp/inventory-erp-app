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
  BookOpen,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Trash2,
  Building2,
} from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

function Row({ icon: Icon, label, value }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.row}>
      <Icon size={16} color={colors.textSoft} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function CustomerDetailScreen({ route, navigation }) {
  const { id, name: nameParam } = route.params || {};
  const { formatAmount } = useCurrency();
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomer = async () => {
    try {
      const { data } = await axiosInstance.get(`/customers/${id}`);
      if (data.success) setCustomer(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchCustomer);
    return unsub;
  }, [navigation, id]);

  const confirmDelete = () => {
    Alert.alert('Delete customer', 'This cannot be undone if the customer has no dependent records.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/customers/${id}`);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Could not delete customer');
          }
        },
      },
    ]);
  };

  if (isLoading && !customer) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Customer not found.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addr = customer.address || {};
  const addressLine = [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {customer.name || nameParam}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroName}>{customer.name}</Text>
          {customer.company ? (
            <View style={styles.heroRow}>
              <Building2 size={16} color={colors.textMuted} />
              <Text style={styles.heroSub}>{customer.company}</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.badge,
              { backgroundColor: customer.status === 'active' ? colors.successSoft : colors.surfaceStrong },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: customer.status === 'active' ? colors.success : colors.textMuted },
              ]}
            >
              {(customer.status || 'active').toUpperCase()} · {(customer.type || 'retail').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row icon={Phone} label="Phone" value={customer.phone} />
          <Row icon={Phone} label="Alternate phone" value={customer.alternatePhone} />
          <Row icon={Mail} label="Email" value={customer.email} />
          <Row icon={MapPin} label="Address" value={addressLine || null} />
          {customer.taxNumber ? (
            <Row icon={Building2} label="Tax number" value={customer.taxNumber} />
          ) : null}
          <View style={styles.creditRow}>
            <Text style={styles.rowLabel}>Credit limit</Text>
            <Text style={styles.creditValue}>{formatAmount(customer.creditLimit ?? 0)}</Text>
          </View>
        </View>

        {customer.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{customer.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={() => navigation.navigate('CustomerLedger', { id: customer._id, name: customer.name })}
          >
            <BookOpen size={18} color={colors.primary} />
            <Text style={styles.actionSecondaryText}>Customer ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={() => navigation.navigate('CustomerEdit', { id: customer._id })}
          >
            <Edit3 size={18} color={colors.primary} />
            <Text style={styles.actionSecondaryText}>Edit customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={confirmDelete}>
            <Trash2 size={18} color={colors.danger} />
            <Text style={styles.actionDangerText}>Delete customer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: colors.text },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  heroSub: { fontSize: 15, color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  rowLabel: { fontSize: 12, fontWeight: '700', color: colors.textSoft },
  rowValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  creditRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditValue: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  notes: { fontSize: 15, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 15, color: colors.textMuted },
  actions: { gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionSecondaryText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  actionDanger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionDangerText: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
