import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Package,
  Plus,
  Search,
  Trash2,
  User,
  Warehouse,
} from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const shippingMethods = [
  { label: 'Pickup', value: 'pickup' },
  { label: 'Local Delivery', value: 'local-delivery' },
  { label: 'Courier', value: 'courier' },
  { label: 'Freight', value: 'freight' },
];

const emptyLine = () => ({ productId: null, productName: '', sku: '', quantity: '1', description: '' });
const mapOrderItem = (item) => ({
  productId: item.product?._id || item.product || null,
  productName: item.product?.name || item.productName || '',
  sku: item.product?.sku || '',
  quantity: String(item.pendingQuantity || item.quantity || 1),
  description: item.description || '',
});

export default function DeliveryCreateScreen({ navigation }) {
  const [sourceType, setSourceType] = useState('sale-order');
  const [customerMode, setCustomerMode] = useState('existing');
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productTargetIndex, setProductTargetIndex] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [warehouseModal, setWarehouseModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('courier');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [items, setItems] = useState([emptyLine()]);

  useEffect(() => {
    const load = async () => {
      try {
        const [o, c, w] = await Promise.all([
          axiosInstance.get('/sales/orders?status=confirmed,processing,shipped&limit=50'),
          axiosInstance.get('/customers?page=1&limit=100'),
          axiosInstance.get('/warehouses?page=1&limit=50'),
        ]);
        const nextOrders = o.data?.success ? o.data.data || [] : [];
        const nextCustomers = c.data?.success ? c.data.data || [] : [];
        const nextWarehouses = w.data?.success ? w.data.data || [] : [];
        setOrders(nextOrders);
        setCustomers(nextCustomers);
        setWarehouses(nextWarehouses);
        if (nextWarehouses.length) setSelectedWarehouse(nextWarehouses[0]);
      } catch (error) {
        console.error('Error loading delivery creation data', error);
        Alert.alert('Error', 'Failed to load delivery setup data.');
      } finally {
        setBootstrapLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!productModal) return undefined;
    const id = setTimeout(async () => {
      setProductLoading(true);
      try {
        const query = productSearch.trim() ? `&search=${encodeURIComponent(productSearch.trim())}` : '';
        const { data } = await axiosInstance.get(`/products?page=1&limit=40${query}`);
        if (data.success) setProducts(data.data || []);
      } catch (error) {
        console.error('Error fetching products', error);
      } finally {
        setProductLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [productModal, productSearch]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => order.orderNumber?.toLowerCase().includes(q) || order.customer?.name?.toLowerCase().includes(q));
  }, [orders, orderSearch]);

  const setAddress = (address = {}) => {
    setStreet(address.street || '');
    setCity(address.city || '');
    setStateName(address.state || '');
    setPostalCode(address.postalCode || '');
    setCountry(address.country || '');
  };

  const applyOrder = (order) => {
    setSelectedOrder(order);
    setSelectedCustomer(order.customer || null);
    if (order.warehouse) setSelectedWarehouse(order.warehouse);
    setContactName(order.customer?.name || '');
    setContactPhone(order.customer?.phone || '');
    setAddress(order.shippingAddress || order.customer?.address || {});
    setItems((order.items || []).length ? order.items.map(mapOrderItem) : [emptyLine()]);
  };

  const applyCustomer = (customer) => {
    setSelectedCustomer(customer);
    setManualName(customer?.name || '');
    setManualEmail(customer?.email || '');
    setManualPhone(customer?.phone || '');
    setManualCompany(customer?.company || '');
    setContactName(customer?.name || '');
    setContactPhone(customer?.phone || '');
    setAddress(customer?.address || {});
  };

  const addLine = () => setItems((current) => [...current, emptyLine()]);
  const removeLine = (index) => setItems((current) => current.length <= 1 ? current : current.filter((_, i) => i !== index));
  const changeLine = (index, field, value) => setItems((current) => current.map((line, i) => {
    if (i !== index) return line;
    const next = { ...line, [field]: value };
    if (field === 'productName' && value.trim()) {
      next.productId = null;
      next.sku = '';
    }
    return next;
  }));
  const chooseProduct = (product) => {
    setItems((current) => current.map((line, i) => i === productTargetIndex ? {
      ...line,
      productId: product._id,
      productName: product.name || '',
      sku: product.sku || '',
    } : line));
    setProductModal(false);
  };

  const validateItems = () => {
    const payloadItems = items.filter((line) => line.productId || line.productName.trim());
    if (!payloadItems.length) return { error: 'Add at least one delivery item.' };
    for (let index = 0; index < payloadItems.length; index += 1) {
      const line = payloadItems[index];
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return { error: `Line ${index + 1}: quantity must be greater than 0.` };
      if (!line.productId && !line.productName.trim()) return { error: `Line ${index + 1}: select a product or enter a custom name.` };
    }
    return {
      items: payloadItems.map((line) => ({
        product: line.productId || undefined,
        productName: line.productId ? undefined : line.productName.trim(),
        quantity: Number(line.quantity),
        description: line.description.trim() || undefined,
      })),
    };
  };

  const submit = async () => {
    if (sourceType === 'sale-order' && !selectedOrder?._id) {
      Alert.alert('Missing sales order', 'Select a sales order or switch to manual mode.');
      return;
    }
    if (sourceType === 'manual' && !selectedWarehouse?._id) {
      Alert.alert('Warehouse required', 'Select a warehouse for manual delivery.');
      return;
    }
    if (!scheduledDate.trim()) {
      Alert.alert('Missing scheduled date', 'Enter the scheduled delivery date.');
      return;
    }
    if (!street.trim() || !city.trim() || !stateName.trim() || !postalCode.trim() || !country.trim()) {
      Alert.alert('Incomplete address', 'Street, city, state, postal code, and country are required.');
      return;
    }
    if (sourceType === 'manual' && customerMode === 'existing' && !selectedCustomer?._id) {
      Alert.alert('Customer required', 'Select a customer or switch to custom customer.');
      return;
    }
    if (sourceType === 'manual' && customerMode === 'custom' && !manualName.trim()) {
      Alert.alert('Customer required', 'Enter a custom customer name.');
      return;
    }
    const itemResult = validateItems();
    if (itemResult.error) {
      Alert.alert('Line items', itemResult.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sourceType,
        shippingMethod,
        shippingCarrier: shippingMethod === 'pickup' ? undefined : shippingCarrier.trim() || undefined,
        scheduledDate: new Date(scheduledDate).toISOString(),
        shippingAddress: {
          street: street.trim(),
          city: city.trim(),
          state: stateName.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        },
        specialInstructions: specialInstructions.trim() || undefined,
        items: itemResult.items,
      };
      if (sourceType === 'sale-order') {
        payload.saleOrder = selectedOrder._id;
      } else {
        payload.warehouse = selectedWarehouse._id;
        if (customerMode === 'existing') payload.customer = selectedCustomer._id;
        else payload.manualCustomer = {
          name: manualName.trim(),
          email: manualEmail.trim() || undefined,
          phone: manualPhone.trim() || undefined,
          company: manualCompany.trim() || undefined,
        };
      }
      const { data } = await axiosInstance.post('/deliveries', payload);
      if (data.success) {
        Alert.alert('Created', 'Delivery note created successfully.');
        navigation.replace('DeliveryDetail', { id: data.data._id });
      }
    } catch (error) {
      console.error('Error creating delivery', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create delivery note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bootstrapLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><ArrowLeft size={20} color={colors.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>New Delivery Note</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={colors.surface} /> : <CheckCircle size={18} color={colors.surface} />}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCaption}>Create from a sales order or manually with customer and item details.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Source</Text>
          <View style={styles.pillRow}>
            {['sale-order', 'manual'].map((value) => {
              const selected = sourceType === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => {
                    setSourceType(value);
                    if (value === 'manual') setSelectedOrder(null);
                    if (value === 'sale-order' && selectedOrder) applyOrder(selectedOrder);
                  }}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{value === 'sale-order' ? 'Sales Order' : 'Manual'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {sourceType === 'sale-order' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sales Order</Text>
            <View style={styles.searchShell}>
              <Search size={18} color={colors.textSoft} />
              <TextInput style={styles.searchInput} placeholder="Search order number or customer" placeholderTextColor={colors.textSoft} value={orderSearch} onChangeText={setOrderSearch} />
            </View>
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No eligible sales orders found.</Text>}
              renderItem={({ item }) => {
                const selected = selectedOrder?._id === item._id;
                return (
                  <TouchableOpacity style={[styles.orderCard, selected && styles.orderCardSelected]} onPress={() => applyOrder(item)}>
                    <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                    <Text style={styles.orderMeta}>{item.customer?.name || 'Unknown customer'}</Text>
                    <Text style={styles.orderMeta}>Warehouse: {item.warehouse?.name || 'N/A'}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Customer</Text>
              <View style={styles.pillRow}>
                {['existing', 'custom'].map((value) => {
                  const selected = customerMode === value;
                  return (
                    <TouchableOpacity key={value} style={[styles.pill, selected && styles.pillSelected]} onPress={() => {
                      setCustomerMode(value);
                      if (value === 'custom') setSelectedCustomer(null);
                    }}>
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{value === 'existing' ? 'Existing' : 'Custom'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {customerMode === 'existing' ? (
                <TouchableOpacity style={styles.selectRow} onPress={() => setCustomerModal(true)}>
                  <User size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectLabel}>{selectedCustomer ? selectedCustomer.name : 'Tap to choose customer'}</Text>
                    {selectedCustomer?.phone ? <Text style={styles.selectHint}>{selectedCustomer.phone}</Text> : null}
                  </View>
                  <ChevronRight size={18} color={colors.textSoft} />
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.inputGroup}><Text style={styles.label}>Customer Name</Text><TextInput style={styles.input} value={manualName} onChangeText={setManualName} /></View>
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Phone</Text><TextInput style={styles.input} value={manualPhone} onChangeText={setManualPhone} /></View>
                    <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Email</Text><TextInput style={styles.input} value={manualEmail} onChangeText={setManualEmail} autoCapitalize="none" /></View>
                  </View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Company</Text><TextInput style={styles.input} value={manualCompany} onChangeText={setManualCompany} /></View>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Warehouse</Text>
              <TouchableOpacity style={styles.selectRow} onPress={() => setWarehouseModal(true)}>
                <Warehouse size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectLabel}>{selectedWarehouse ? selectedWarehouse.name : 'Tap to choose warehouse'}</Text>
                  {selectedWarehouse?.code ? <Text style={styles.selectHint}>{selectedWarehouse.code}</Text> : null}
                </View>
                <ChevronRight size={18} color={colors.textSoft} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.pillRow}>
            {shippingMethods.map((method) => {
              const selected = shippingMethod === method.value;
              return (
                <TouchableOpacity key={method.value} style={[styles.pill, selected && styles.pillSelected]} onPress={() => setShippingMethod(method.value)}>
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{method.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {shippingMethod !== 'pickup' ? (
            <View style={styles.inputGroup}><Text style={styles.label}>Carrier</Text><TextInput style={styles.input} value={shippingCarrier} onChangeText={setShippingCarrier} placeholder="Optional carrier name" placeholderTextColor={colors.textSoft} /></View>
          ) : null}
          <View style={styles.inputGroup}><Text style={styles.label}>Scheduled Date</Text><TextInput style={styles.input} value={scheduledDate} onChangeText={setScheduledDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSoft} /></View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={addLine}><Plus size={16} color={colors.primary} /><Text style={styles.addLineText}>Add line</Text></TouchableOpacity>
          </View>
          {items.map((line, index) => (
            <View key={`${line.productId || 'custom'}-${index}`} style={styles.lineCard}>
              <TouchableOpacity style={styles.selectRow} onPress={() => { setProductTargetIndex(index); setProductSearch(''); setProducts([]); setProductModal(true); }}>
                <Package size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectLabel}>{line.productId ? line.productName : 'Select product or use custom item'}</Text>
                  {line.sku ? <Text style={styles.selectHint}>SKU {line.sku}</Text> : null}
                </View>
                <ChevronRight size={18} color={colors.textSoft} />
              </TouchableOpacity>
              {!line.productId ? (
                <View style={styles.inputGroup}><Text style={styles.label}>Custom Item Name</Text><TextInput style={styles.input} value={line.productName} onChangeText={(value) => changeLine(index, 'productName', value)} /></View>
              ) : null}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Quantity</Text><TextInput style={styles.input} value={line.quantity} onChangeText={(value) => changeLine(index, 'quantity', value)} keyboardType="decimal-pad" /></View>
                <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Description</Text><TextInput style={styles.input} value={line.description} onChangeText={(value) => changeLine(index, 'description', value)} /></View>
              </View>
              {items.length > 1 ? (
                <TouchableOpacity style={styles.removeLine} onPress={() => removeLine(index)}><Trash2 size={16} color={colors.danger} /><Text style={styles.removeLineText}>Remove line</Text></TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.inputGroup}><Text style={styles.label}>Street</Text><TextInput style={styles.input} value={street} onChangeText={setStreet} /></View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>City</Text><TextInput style={styles.input} value={city} onChangeText={setCity} /></View>
            <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>State</Text><TextInput style={styles.input} value={stateName} onChangeText={setStateName} /></View>
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Postal Code</Text><TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} /></View>
            <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Country</Text><TextInput style={styles.input} value={country} onChangeText={setCountry} /></View>
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Contact Name</Text><TextInput style={styles.input} value={contactName} onChangeText={setContactName} /></View>
            <View style={[styles.inputGroup, styles.inputHalf]}><Text style={styles.label}>Contact Phone</Text><TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} /></View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline textAlignVertical="top" value={specialInstructions} onChangeText={setSpecialInstructions} placeholder="Optional handling, routing, or drop-off notes" placeholderTextColor={colors.textSoft} />
        </View>
      </ScrollView>

      <Modal visible={customerModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Customers</Text>
            <FlatList
              data={customers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalRow} onPress={() => { applyCustomer(item); setCustomerModal(false); }}>
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  {item.phone ? <Text style={styles.selectHint}>{item.phone}</Text> : null}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCustomerModal(false)}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={warehouseModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Warehouses</Text>
            <FlatList
              data={warehouses}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalRow} onPress={() => { setSelectedWarehouse(item); setWarehouseModal(false); }}>
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  {item.code ? <Text style={styles.selectHint}>{item.code}</Text> : null}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setWarehouseModal(false)}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={productModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Products</Text>
            <TextInput style={styles.input} placeholder="Search product name or SKU" placeholderTextColor={colors.textSoft} value={productSearch} onChangeText={setProductSearch} />
            {productLoading ? <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} /> : (
              <FlatList
                data={products}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalRow} onPress={() => chooseProduct(item)}>
                    <Text style={styles.modalRowTitle}>{item.name}</Text>
                    <Text style={styles.selectHint}>{item.sku || 'No SKU'}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setProductModal(false)}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.card },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceMuted },
  headerTitle: { flex: 1, ...typography.sectionTitle, fontSize: 22 },
  headerCaption: { marginTop: 10, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  saveBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.card },
  sectionTitle: { ...typography.sectionTitle, fontSize: 18, marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  pill: { borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  pillSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  pillTextSelected: { color: colors.primaryDark },
  searchShell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginVertical: spacing.md },
  orderCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surfaceMuted },
  orderCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  orderNumber: { fontSize: 15, fontWeight: '800', color: colors.text },
  orderMeta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
  selectLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  selectHint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  inputGroup: { marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.md },
  inputHalf: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, fontSize: 15, color: colors.text },
  textArea: { minHeight: 100, paddingTop: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addLineText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  lineCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.surfaceMuted },
  removeLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  removeLineText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.md, maxHeight: '80%' },
  modalTitle: { ...typography.sectionTitle, marginBottom: spacing.sm },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  modalClose: { marginTop: spacing.md, alignItems: 'center', padding: spacing.md },
  modalCloseText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});
