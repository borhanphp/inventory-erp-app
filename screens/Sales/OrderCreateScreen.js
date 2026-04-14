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
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, ChevronRight, Package, Plus, Trash2, User, Warehouse } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

const emptyLine = () => ({
  productId: null,
  productName: '',
  sku: '',
  quantity: '1',
  unitPrice: '0',
  discount: '0',
});

export default function OrderCreateScreen({ navigation }) {
  const { formatAmount } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [warehouse, setWarehouse] = useState(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyLine()]);

  const [custModal, setCustModal] = useState(false);
  const [whModal, setWhModal] = useState(false);
  const [prodModal, setProdModal] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [lineIndexForProduct, setLineIndexForProduct] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, wRes] = await Promise.all([
          axiosInstance.get('/customers?page=1&limit=100'),
          axiosInstance.get('/warehouses?page=1&limit=50'),
        ]);
        if (cRes.data?.success) setCustomers(cRes.data.data || []);
        if (wRes.data?.success) {
          const wh = wRes.data.data || [];
          setWarehouses(wh);
          if (wh.length) setWarehouse((prev) => prev || wh[0]);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const fetchProducts = async (search) => {
    setProdLoading(true);
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const { data } = await axiosInstance.get(`/products?page=1&limit=40${q}`);
      if (data.success) setProducts(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setProdLoading(false);
    }
  };

  useEffect(() => {
    if (!prodModal) return;
    const t = setTimeout(() => fetchProducts(prodSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [prodModal, prodSearch]);

  const openProductPicker = (index) => {
    setLineIndexForProduct(index);
    setProdSearch('');
    setProducts([]);
    setProdModal(true);
    fetchProducts('');
  };

  const applyProduct = (p) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[lineIndexForProduct] };
      row.productId = p._id;
      row.productName = p.name || '';
      row.sku = p.sku || '';
      row.unitPrice = (p.price != null ? String(p.price) : row.unitPrice) || '0';
      next[lineIndexForProduct] = row;
      return next;
    });
    setProdModal(false);
  };

  const handleAddLine = () => setItems((prev) => [...prev, emptyLine()]);

  const handleRemoveLine = (index) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleChangeLine = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const computeTotals = () => {
    let subtotal = 0;
    items.forEach((row) => {
      const q = parseFloat(row.quantity) || 0;
      const p = parseFloat(row.unitPrice) || 0;
      const d = parseFloat(row.discount) || 0;
      const line = q * p * (1 - Math.min(d, 100) / 100);
      subtotal += line;
    });
    return subtotal;
  };

  const handleSubmit = async () => {
    if (!customer?._id) {
      Alert.alert('Customer required', 'Select a customer for this order.');
      return;
    }
    if (!warehouse?._id) {
      Alert.alert('Warehouse required', 'Select a fulfillment warehouse.');
      return;
    }

    const lines = items.filter((r) => r.productId);
    if (!lines.length) {
      Alert.alert('Line items', 'Add at least one product line.');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const row = lines[i];
      if (parseFloat(row.quantity) <= 0 || parseFloat(row.unitPrice) < 0) {
        Alert.alert('Line items', `Line ${i + 1}: quantity and unit price must be valid.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: customer._id,
        warehouseId: warehouse._id,
        items: lines.map((row) => ({
          product: row.productId,
          quantity: parseFloat(row.quantity),
          unitPrice: parseFloat(row.unitPrice),
          discount: parseFloat(row.discount) || 0,
        })),
        notes: notes.trim() || undefined,
        status: 'draft',
      };

      const { data } = await axiosInstance.post('/sales/orders', payload);
      if (data.success) {
        Alert.alert('Created', 'Sales order saved as draft.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Could not create order', error.response?.data?.message || error.message || 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotalPreview = computeTotals();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New sales order</Text>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer</Text>
            <TouchableOpacity style={styles.selectRow} onPress={() => setCustModal(true)}>
              <User size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectLabel}>{customer ? customer.name : 'Tap to choose'}</Text>
                {customer?.phone ? (
                  <Text style={styles.selectHint}>{customer.phone}</Text>
                ) : null}
              </View>
              <ChevronRight size={18} color={colors.textSoft} />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Warehouse</Text>
            <TouchableOpacity style={styles.selectRow} onPress={() => setWhModal(true)}>
              <Warehouse size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectLabel}>{warehouse ? warehouse.name : 'Tap to choose'}</Text>
              </View>
              <ChevronRight size={18} color={colors.textSoft} />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Line items</Text>
              <TouchableOpacity style={styles.addLineBtn} onPress={handleAddLine}>
                <Plus size={16} color={colors.primary} />
                <Text style={styles.addLineText}>Add line</Text>
              </TouchableOpacity>
            </View>

            {items.map((row, index) => (
              <View key={index} style={styles.lineCard}>
                <TouchableOpacity style={styles.productPick} onPress={() => openProductPicker(index)}>
                  <Package size={18} color={colors.textSoft} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productPickTitle}>
                      {row.productId ? row.productName || 'Product' : 'Select product'}
                    </Text>
                    {row.sku ? <Text style={styles.selectHint}>SKU {row.sku}</Text> : null}
                  </View>
                  <ChevronRight size={18} color={colors.textSoft} />
                </TouchableOpacity>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                    <Text style={styles.label}>Qty</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={row.quantity}
                      onChangeText={(v) => handleChangeLine(index, 'quantity', v)}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 6 }]}>
                    <Text style={styles.label}>Unit price</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={row.unitPrice}
                      onChangeText={(v) => handleChangeLine(index, 'unitPrice', v)}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                    <Text style={styles.label}>Disc %</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={row.discount}
                      onChangeText={(v) => handleChangeLine(index, 'discount', v)}
                    />
                  </View>
                </View>
                {items.length > 1 ? (
                  <TouchableOpacity style={styles.removeLine} onPress={() => handleRemoveLine(index)}>
                    <Trash2 size={16} color={colors.danger} />
                    <Text style={styles.removeLineText}>Remove line</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

            <View style={styles.totalBanner}>
              <Text style={styles.totalLabel}>Estimated subtotal</Text>
              <Text style={styles.totalValue}>{formatAmount(subtotalPreview)}</Text>
            </View>
            <Text style={styles.totalNote}>Final totals are calculated on the server when you save.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              placeholder="Internal notes (optional)"
              placeholderTextColor={colors.textSoft}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={custModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Customers</Text>
            <FlatList
              data={customers}
              keyExtractor={(c) => c._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setCustomer(item);
                    setCustModal(false);
                  }}
                >
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  {item.phone ? <Text style={styles.selectHint}>{item.phone}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyHint}>No customers found.</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCustModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={whModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Warehouses</Text>
            <FlatList
              data={warehouses}
              keyExtractor={(w) => w._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setWarehouse(item);
                    setWhModal(false);
                  }}
                >
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  {item.code ? <Text style={styles.selectHint}>{item.code}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyHint}>No warehouses found.</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setWhModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={prodModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Products</Text>
            <TextInput
              style={styles.input}
              placeholder="Search name or SKU"
              placeholderTextColor={colors.textSoft}
              value={prodSearch}
              onChangeText={setProdSearch}
            />
            {prodLoading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : (
              <FlatList
                data={products}
                keyExtractor={(p) => p._id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalRow} onPress={() => applyProduct(item)}>
                    <Text style={styles.modalRowTitle}>{item.name}</Text>
                    <Text style={styles.selectHint}>
                      {item.sku ? `${item.sku} · ` : ''}{item.price != null ? formatAmount(Number(item.price)) : ''}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyHint}>No products match.</Text>}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setProdModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  selectLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  selectHint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addLineText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  lineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  productPick: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  productPickTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 0 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSoft, marginBottom: 4 },
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
  notes: { minHeight: 88, textAlignVertical: 'top' },
  removeLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  removeLineText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  totalBanner: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
  totalNote: { marginTop: 8, fontSize: 12, color: colors.textSoft },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.md,
    maxHeight: '80%',
  },
  modalTitle: { ...typography.sectionTitle, marginBottom: spacing.sm },
  modalRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalRowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  modalClose: { marginTop: spacing.md, alignItems: 'center', padding: spacing.md },
  modalCloseText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  emptyHint: { textAlign: 'center', color: colors.textMuted, marginVertical: 24 },
});
