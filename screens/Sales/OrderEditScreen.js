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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function OrderEditScreen({ route, navigation }) {
  const { id } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get(`/sales/orders/${id}`);
        if (data.success) {
          const o = data.data;
          setStatus(o.status || '');
          setNotes(o.notes || '');
          setTerms(o.terms || '');
          if (o.expectedDeliveryDate) {
            setExpectedDeliveryDate(new Date(o.expectedDeliveryDate).toISOString().slice(0, 10));
          }
        }
      } catch (e) {
        Alert.alert('Error', 'Could not load order');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, navigation]);

  const handleSave = async () => {
    if (status !== 'draft') {
      Alert.alert('Read only', 'Only draft orders can be edited in the mobile app.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
      };
      if (expectedDeliveryDate.trim()) {
        const d = new Date(expectedDeliveryDate.trim());
        if (!Number.isNaN(d.getTime())) {
          payload.expectedDeliveryDate = d.toISOString();
        }
      }

      const { data } = await axiosInstance.put(`/sales/orders/${id}`, payload);
      if (data.success) {
        Alert.alert('Saved', 'Order updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit order</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSubmitting || status !== 'draft'}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={[styles.saveBtn, status !== 'draft' && { opacity: 0.4 }]}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {status !== 'draft' ? (
          <Text style={styles.warn}>
            This order is no longer a draft. Editing details is disabled on mobile.
          </Text>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.area]}
            placeholder="Internal notes"
            placeholderTextColor={colors.textSoft}
            value={notes}
            onChangeText={setNotes}
            multiline
            editable={status === 'draft'}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Terms</Text>
          <TextInput
            style={[styles.input, styles.area]}
            placeholder="Terms shown to customer (if applicable)"
            placeholderTextColor={colors.textSoft}
            value={terms}
            onChangeText={setTerms}
            multiline
            editable={status === 'draft'}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expected delivery</Text>
          <Text style={styles.hint}>Format YYYY-MM-DD</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-12-31"
            placeholderTextColor={colors.textSoft}
            value={expectedDeliveryDate}
            onChangeText={setExpectedDeliveryDate}
            editable={status === 'draft'}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  warn: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
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
  cardTitle: { ...typography.sectionTitle, fontSize: 16, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.textSoft, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  area: { minHeight: 100, textAlignVertical: 'top' },
});
