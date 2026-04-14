import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { buildCustomerPayload, isProbablyValidEmail } from './quotationCustomerFormUtils';
import { useCurrency } from '../../utils/currency';

export default function QuotationEditScreen({ route, navigation }) {
  const { id } = route.params;
  const { currencySymbol, formatAmount } = useCurrency();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stored original IDs and Refs
  const [quotation, setQuotation] = useState(null);
  const [customerId, setCustomerId] = useState('');

  // Editable Fields
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
  const [taxRate, setTaxRate] = useState('0');
  const [validDays, setValidDays] = useState('30'); 

  // Items
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const { data } = await axiosInstance.get(`/quotations/${id}`);
      if (data.success) {
        const q = data.data;
        setQuotation(q);
        setCustomerId(q.customer?._id || '');
        const c = q.customer || {};
        setCustomerName(c.name || '');
        setCustomerPhone(c.phone || '');
        setCustomerEmail(c.email || '');
        setCustomerAltPhone(c.alternatePhone || '');
        setCustomerCompany(c.company || '');
        setCustomerType(c.type === 'wholesale' ? 'wholesale' : 'retail');
        setCustomerTaxNumber(c.taxNumber || '');
        setCustomerNotes(c.notes || '');
        setAddrStreet(c.address?.street || '');
        setAddrCity(c.address?.city || '');
        setAddrState(c.address?.state || '');
        setAddrPostal(c.address?.postalCode || '');
        setAddrCountry(c.address?.country || 'USA');
        setTaxRate((q.taxRate || 0).toString());
        if (q.validUntil) {
          const validUntil = new Date(q.validUntil);
          const now = new Date();
          const diffDays = Math.max(0, Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          setValidDays(diffDays.toString());
        }

        // Format existing line items to strings for inputs
        const formattedItems = q.items.map(i => ({
          productName: i.product?.name || i.productName || '',
          quantity: (i.quantity || 1).toString(),
          unitPrice: (i.unitPrice || 0).toString()
        }));
        
        setItems(formattedItems.length ? formattedItems : [{ productName: '', quantity: '1', unitPrice: '0' }]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch quotation details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Validation Error', 'Customer name and phone are required.');
      return;
    }

    if (!isProbablyValidEmail(customerEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address, or leave email blank.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Validation Error', 'At least one item is required.');
      return;
    }

    const invalidItem = items.find(i => !i.productName.trim() || parseFloat(i.quantity) <= 0 || parseFloat(i.unitPrice) <= 0);
    if (invalidItem) {
      Alert.alert('Validation Error', 'All items must have a Name, Quantity > 0, and Price > 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (customerId && !quotation?.convertedToOrder) {
        await axiosInstance.put(
          `/customers/${customerId}`,
          buildCustomerPayload({
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            alternatePhone: customerAltPhone,
            company: customerCompany,
            type: customerType,
            taxNumber: customerTaxNumber,
            notes: customerNotes,
            street: addrStreet,
            city: addrCity,
            state: addrState,
            postalCode: addrPostal,
            country: addrCountry,
          })
        );
      }

      const formattedItems = items.map(i => ({
        productName: i.productName,
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
      }));

      const totals = calculateTotals();
      
      const vDate = new Date();
      vDate.setDate(vDate.getDate() + (parseInt(validDays) || 30));

      const payload = {
        customer: customerId || undefined,
        validUntil: vDate.toISOString(),
        items: formattedItems,
        subtotal: totals.subtotal,
        taxRate: parseFloat(taxRate) || 0,
        taxAmount: totals.taxAmount,
        discountType: quotation?.discountType || 'percentage',
        discountValue: quotation?.discountValue || 0,
        discountAmount: quotation?.discountAmount || 0,
        totalAmount: totals.totalAmount,
      };

      const { data } = await axiosInstance.put(`/quotations/${id}`, payload);
      
      if (data.success) {
        Alert.alert('Success', 'Quotation updated successfully');
        navigation.goBack(); 
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const { subtotal, totalAmount } = calculateTotals();
  const customerLocked = !!quotation?.convertedToOrder;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Quotation</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#4f46e5" />
          ) : (
            <View style={styles.saveBtn}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Update</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Customer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          {customerLocked ? (
            <Text style={styles.sectionHint}>This quotation is converted; customer details are read-only.</Text>
          ) : (
            <Text style={styles.sectionHint}>Updates are saved to the customer record when you tap Update.</Text>
          )}

          <Text style={styles.sectionLabel}>Primary contact</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.input, customerLocked && styles.inputLocked]}
              value={customerName}
              onChangeText={setCustomerName}
              editable={!customerLocked}
              placeholder="Name"
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={[styles.input, customerLocked && styles.inputLocked]}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                editable={!customerLocked}
                placeholder="Phone"
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Alt phone</Text>
              <TextInput
                style={[styles.input, customerLocked && styles.inputLocked]}
                value={customerAltPhone}
                onChangeText={setCustomerAltPhone}
                editable={!customerLocked}
                placeholder="Optional"
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (optional)</Text>
            <TextInput
              style={[styles.input, customerLocked && styles.inputLocked]}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              editable={!customerLocked}
              placeholder="Leave blank if unknown"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.sectionLabel}>Company</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company name</Text>
            <TextInput
              style={[styles.input, customerLocked && styles.inputLocked]}
              value={customerCompany}
              onChangeText={setCustomerCompany}
              editable={!customerLocked}
              placeholder="Optional"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  { marginRight: 8 },
                  customerType === 'retail' && styles.typeChipActive,
                  customerLocked && styles.typeChipDisabled,
                ]}
                onPress={() => !customerLocked && setCustomerType('retail')}
                disabled={customerLocked}
              >
                <Text style={[styles.typeChipText, customerType === 'retail' && styles.typeChipTextActive]}>Retail</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  customerType === 'wholesale' && styles.typeChipActive,
                  customerLocked && styles.typeChipDisabled,
                ]}
                onPress={() => !customerLocked && setCustomerType('wholesale')}
                disabled={customerLocked}
              >
                <Text style={[styles.typeChipText, customerType === 'wholesale' && styles.typeChipTextActive]}>Wholesale</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax / VAT ID</Text>
            <TextInput
              style={[styles.input, customerLocked && styles.inputLocked]}
              value={customerTaxNumber}
              onChangeText={setCustomerTaxNumber}
              editable={!customerLocked}
              placeholder="Optional"
              autoCapitalize="characters"
            />
          </View>

          <Text style={styles.sectionLabel}>Address</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={[styles.input, customerLocked && styles.inputLocked]}
              value={addrStreet}
              onChangeText={setAddrStreet}
              editable={!customerLocked}
              placeholder="Street"
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={[styles.input, customerLocked && styles.inputLocked]}
                value={addrCity}
                onChangeText={setAddrCity}
                editable={!customerLocked}
                placeholder="City"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>State / region</Text>
              <TextInput
                style={[styles.input, customerLocked && styles.inputLocked]}
                value={addrState}
                onChangeText={setAddrState}
                editable={!customerLocked}
                placeholder="State"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Postal code</Text>
              <TextInput
                style={[styles.input, customerLocked && styles.inputLocked]}
                value={addrPostal}
                onChangeText={setAddrPostal}
                editable={!customerLocked}
                placeholder="ZIP"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={[styles.input, customerLocked && styles.inputLocked]}
                value={addrCountry}
                onChangeText={setAddrCountry}
                editable={!customerLocked}
                placeholder="USA"
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Notes</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer notes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, customerLocked && styles.inputLocked]}
              value={customerNotes}
              onChangeText={setCustomerNotes}
              editable={!customerLocked}
              placeholder="Optional"
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financials</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Valid For (Days)</Text>
              <TextInput 
                style={styles.input}
                value={validDays}
                onChangeText={setValidDays}
                keyboardType="numeric"
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
                <Text style={styles.label}>Product Name *</Text>
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
  typeChipDisabled: { opacity: 0.55 },
  typeChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  typeChipTextActive: { color: '#4f46e5' },
  inputMultiline: { minHeight: 88, paddingTop: 10 },
  inputLocked: { backgroundColor: '#f1f5f9', color: '#64748b' },
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
    backgroundColor: '#fdfdfd'
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
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
