import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const emailOk = (s) => {
  const t = s.trim();
  if (!t) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
};

export default function CustomerEditScreen({ route, navigation }) {
  const { id } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('retail');
  const [status, setStatus] = useState('active');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('USA');
  const [taxNumber, setTaxNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get(`/customers/${id}`);
        if (data.success) {
          const c = data.data;
          setName(c.name || '');
          setPhone(c.phone || '');
          setEmail(c.email || '');
          setCompany(c.company || '');
          setType(c.type || 'retail');
          setStatus(c.status || 'active');
          setTaxNumber(c.taxNumber || '');
          setCreditLimit(String(c.creditLimit ?? 0));
          setNotes(c.notes || '');
          const a = c.address || {};
          setStreet(a.street || '');
          setCity(a.city || '');
          setState(a.state || '');
          setPostalCode(a.postalCode || '');
          setCountry(a.country || 'USA');
        }
      } catch {
        Alert.alert('Error', 'Could not load customer');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, navigation]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Name and phone are required.');
      return;
    }
    if (!emailOk(email)) {
      Alert.alert('Email', 'Enter a valid email or leave it blank.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        company: company.trim() || undefined,
        type,
        status,
        taxNumber: taxNumber.trim() || undefined,
        creditLimit: parseFloat(creditLimit) || 0,
        notes: notes.trim() || undefined,
        address: {
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          country: country.trim() || undefined,
        },
      };
      const em = email.trim();
      if (em) payload.email = em.toLowerCase();

      const { data } = await axiosInstance.put(`/customers/${id}`, payload);
      if (data.success) {
        Alert.alert('Saved', 'Customer updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chip = (selected, label, onPress) => (
    <TouchableOpacity style={[styles.chip, selected && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit customer</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.saveBtn}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Primary</Text>
            <Field label="Name *" value={name} onChangeText={setName} />
            <Field label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Company" value={company} onChangeText={setCompany} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Classification</Text>
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipRow}>
              {chip(type === 'retail', 'Retail', () => setType('retail'))}
              {chip(type === 'wholesale', 'Wholesale', () => setType('wholesale'))}
            </View>
            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Status</Text>
            <View style={styles.chipRow}>
              {chip(status === 'active', 'Active', () => setStatus('active'))}
              {chip(status === 'inactive', 'Inactive', () => setStatus('inactive'))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Address</Text>
            <Field label="Street" value={street} onChangeText={setStreet} />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Field label="City" value={city} onChangeText={setCity} />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Field label="State" value={state} onChangeText={setState} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Field label="Postal code" value={postalCode} onChangeText={setPostalCode} />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Field label="Country" value={country} onChangeText={setCountry} />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Billing</Text>
            <Field label="Tax number" value={taxNumber} onChangeText={setTaxNumber} />
            <Field label="Credit limit" value={creditLimit} onChangeText={setCreditLimit} keyboardType="decimal-pad" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <TextInput
              style={[styles.input, styles.area]}
              placeholder="Internal notes"
              placeholderTextColor={colors.textSoft}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  backIcon: { padding: 8 },
  headerTitle: { ...typography.sectionTitle, fontSize: 18, flex: 1, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardTitle: { ...typography.sectionTitle, fontSize: 16, marginBottom: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSoft, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  area: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  chipTextOn: { color: colors.primaryDark },
});
