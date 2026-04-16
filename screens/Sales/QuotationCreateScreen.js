import React, { useState } from 'react';
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
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, CheckCircle, Search, X, Check, UserPlus, Users, ChevronDown, ChevronUp } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { buildCustomerPayload, isProbablyValidEmail } from './quotationCustomerFormUtils';
import { useCurrency } from '../../utils/currency';


// ── Customer Picker Modal ─────────────────────────────────────────────────
function CustomerPickerModal({ visible, onClose, onSelect }) {
  const [query, React_useState] = React.useState('');
  const [customers, setCustomers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const debounceRef = React.useRef(null);

  const fetchCustomers = React.useCallback(async (search = '') => {
    setIsLoading(true);
    try {
      const { data } = await require('../../api/axios').default.get('/customers', {
        params: { search, limit: 30, status: 'active' },
      });
      setCustomers(data?.data || []);
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible) {
      React_useState('');
      fetchCustomers('');
    }
  }, [visible]);

  const onQueryChange = (text) => {
    React_useState(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCustomers(text), 350);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.customerRow} onPress={() => { onSelect(item); onClose(); }} activeOpacity={0.7}>
      <View style={styles.customerAvatar}>
        <Text style={styles.customerAvatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Text style={styles.customerRowName}>{item.name}</Text>
        <Text style={styles.customerRowSub} numberOfLines={1}>
          {[item.company, item.phone, item.email].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Check size={16} color="#4f46e5" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f1f5f9', paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold' }}>Select Customer</Text>
          <TouchableOpacity onPress={onClose}><X size={22} color="#64748b" /></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e2e8f0' }}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput style={{ flex: 1, height: 40, fontSize: 16 }} placeholder="Search by name, phone, email..." value={query} onChangeText={onQueryChange} autoFocus placeholderTextColor="#94a3b8" />
        </View>
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color="#4f46e5" /></View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
          />
        )}
      </View>
    </Modal>
  );
}

export default function QuotationCreateScreen({ navigation }) {
  const [customerMode, setCustomerMode] = useState("custom");
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const handleSelectCustomer = (c) => { setSelectedCustomer(c); setCustomerName(c.name || ""); setCustomerPhone(c.phone || ""); };
  const switchMode = (mode) => { setCustomerMode(mode); setSelectedCustomer(null); setCustomerName(""); setCustomerPhone(""); };

  const { currencySymbol, formatAmount } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAltPhone, setCustomerAltPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerType, setCustomerType] = useState('retail');
  const [customerTaxNumber, setCustomerTaxNumber] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPostal, setAddrPostal] = useState('');
  const [addrCountry, setAddrCountry] = useState('USA');

  // Settings
  const [validDays, setValidDays] = useState('30');
  const [taxRate, setTaxRate] = useState('0');

  // Items
  const [items, setItems] = useState([
    { productName: '', quantity: '1', unitPrice: '0' }
  ]);

  const handleAddItem = () => {
    setItems([...items, { productName: '', quantity: '1', unitPrice: '0' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleChangeItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      return sum + (q * p);
    }, 0);
    
    const tr = parseFloat(taxRate) || 0;
    const taxAmount = (subtotal * tr) / 100;
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async () => {
    if (customerMode === 'existing' && !selectedCustomer) {
      Alert.alert('Validation Error', 'Please select a customer or switch to Custom Customer.');
      return;
    }
    if (customerMode === 'custom' && (!customerName.trim() || !customerPhone.trim())) {
      Alert.alert('Validation Error', 'Customer Name and Phone are required.');
      return;
    }

    if (customerMode === 'custom' && customerEmail && !isProbablyValidEmail(customerEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address, or leave email blank.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Validation Error', 'At least one line item is required.');
      return;
    }

    const invalidItem = items.find(i => !i.productName.trim() || parseFloat(i.quantity) <= 0 || parseFloat(i.unitPrice) <= 0);
    if (invalidItem) {
      Alert.alert('Validation Error', 'All items must have a Name, Quantity > 0, and Price > 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedItems = items.map(i => ({
        productName: i.productName,
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
        totalPrice: parseFloat(i.quantity) * parseFloat(i.unitPrice)
      }));

      const totals = calculateTotals();
      const vDate = new Date();
      vDate.setDate(vDate.getDate() + (parseInt(validDays) || 30));

      const payload = {
        validUntil: vDate.toISOString(),
        items: formattedItems,
        subtotal: totals.subtotal,
        taxRate: parseFloat(taxRate) || 0,
        taxAmount: totals.taxAmount,
        discountType: 'percentage',
        discountValue: 0,
        discountAmount: 0,
        totalAmount: totals.totalAmount,
        status: 'draft',
        ...(customerMode === 'existing' && selectedCustomer
          ? {
              isCustomCustomer: false,
              customer: selectedCustomer._id,
            }
          : {
              isCustomCustomer: true,
              customCustomer: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                taxId: customerTaxNumber,
                address: {
                  street: addrStreet,
                  city: addrCity,
                  state: addrState,
                  zipCode: addrPostal,
                  country: addrCountry,
                },
              },
            })
      };

      const { data } = await axiosInstance.post('/quotations', payload);

      if (data.success) {
        Alert.alert('Success', 'Quotation created successfully');
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, totalAmount } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Quotation</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#4f46e5" />
          ) : (
            <View style={styles.saveBtn}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Customer */}
        <CustomerPickerModal visible={showPicker} onClose={() => setShowPicker(false)} onSelect={handleSelectCustomer} />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity style={[styles.modeBtn, customerMode === 'existing' && styles.modeBtnActive]} onPress={() => switchMode('existing')}>
              <Users size={14} color={customerMode === 'existing' ? '#4f46e5' : '#94a3b8'} />
              <Text style={[styles.modeBtnText, customerMode === 'existing' && styles.modeBtnTextActive]}>Existing Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, customerMode === 'custom' && styles.modeBtnActive]} onPress={() => switchMode('custom')}>
              <UserPlus size={14} color={customerMode === 'custom' ? '#4f46e5' : '#94a3b8'} />
              <Text style={[styles.modeBtnText, customerMode === 'custom' && styles.modeBtnTextActive]}>Custom / Walk-in</Text>
            </TouchableOpacity>
          </View>

          {customerMode === 'existing' && (
            <>
              {selectedCustomer ? (
                <View style={styles.selectedCustomerCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{selectedCustomer.name}</Text>
                    {selectedCustomer.phone && <Text style={{ color: '#64748b' }}>{selectedCustomer.phone}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => switchMode('existing')}><X size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickBtn} onPress={() => setShowPicker(true)}>
                  <Search size={18} color="#4f46e5" />
                  <Text style={styles.pickBtnText}>Search & select a customer</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {customerMode === 'custom' && (
            <>
          <Text style={styles.sectionLabel}>Primary contact</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="e.g. Jane Smith" />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="+1 555-0123" keyboardType="phone-pad" />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Email (optional)</Text>
              <TextInput style={styles.input} value={customerEmail} onChangeText={setCustomerEmail} placeholder="Leave blank if unknown" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Company</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax / VAT ID (Optional)</Text>
            <TextInput style={styles.input} value={customerTaxNumber} onChangeText={setCustomerTaxNumber} placeholder="Optional" />
          </View>

          <Text style={styles.sectionLabel}>Address</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput style={styles.input} value={addrStreet} onChangeText={setAddrStreet} placeholder="Street address" />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.label}>City</Text><TextInput style={styles.input} value={addrCity} onChangeText={setAddrCity} placeholder="City" /></View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.label}>State / region</Text><TextInput style={styles.input} value={addrState} onChangeText={setAddrState} placeholder="State" /></View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.label}>Postal code</Text><TextInput style={styles.input} value={addrPostal} onChangeText={setAddrPostal} placeholder="ZIP" /></View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.label}>Country</Text><TextInput style={styles.input} value={addrCountry} onChangeText={setAddrCountry} placeholder="USA" /></View>
          </View>
            </>
          )}
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Valid For (Days)</Text>
              <TextInput 
                style={styles.input} 
                value={validDays} 
                onChangeText={setValidDays} 
                keyboardType="number-pad" 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Tax Rate (%)</Text>
              <TextInput 
                style={styles.input} 
                value={taxRate} 
                onChangeText={setTaxRate} 
                keyboardType="numeric" 
              />
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <Text style={styles.cardTitle}>Line Items</Text>
            <TouchableOpacity onPress={handleAddItem} style={styles.addBtn}>
              <Plus size={16} color="#4f46e5" />
              <Text style={styles.addBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemBox}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Product Name *</Text>
                <TextInput 
                  style={styles.input} 
                  value={item.productName} 
                  onChangeText={(val) => handleChangeItem(index, 'productName', val)} 
                  placeholder="e.g. Service Retainer" 
                />
              </View>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Qty *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.quantity} 
                    onChangeText={(val) => handleChangeItem(index, 'quantity', val)} 
                    keyboardType="numeric" 
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}>
                  <Text style={styles.label}>Price * ({currencySymbol.trim()})</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.unitPrice} 
                    onChangeText={(val) => handleChangeItem(index, 'unitPrice', val)} 
                    keyboardType="numeric" 
                  />
                </View>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeBtn}>
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Summary Footer */}
        <View style={styles.summaryCard}>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimate:</Text>
            <Text style={styles.totalValue}>{formatAmount(totalAmount)}</Text>
          </View>
        </View>
        
        <View style={{height: 20}} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIcon: { marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  scrollContent: { padding: 16, gap: 16 },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  customerAvatarText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 16 },
  customerRowName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  customerRowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 16 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  modeBtnTextActive: { color: '#4f46e5' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#c7d2fe', borderStyle: 'dashed', borderRadius: 10, padding: 14, backgroundColor: '#f5f3ff' },
  pickBtnText: { flex: 1, fontSize: 14, color: '#4f46e5', fontWeight: '600' },
  selectedCustomerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, padding: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeaderFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  sectionHint: { fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  typeRow: { flexDirection: 'row' },
  typeChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  typeChipActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  typeChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  typeChipTextActive: { color: '#4f46e5' },
  inputMultiline: { minHeight: 88, paddingTop: 10 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc'
  },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  itemBox: { backgroundColor: '#fdfdfd', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 8, padding: 12, marginBottom: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  addBtnText: { color: '#4f46e5', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  removeBtn: { padding: 10, marginBottom: 4, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  summaryLabel: { fontSize: 15, color: '#64748b' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#334155' },
  totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#4f46e5' },
});
