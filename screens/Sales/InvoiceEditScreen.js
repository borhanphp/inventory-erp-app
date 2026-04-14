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
import { useCurrency } from '../../utils/currency';

export default function InvoiceEditScreen({ route, navigation }) {
  const { id } = route.params;
  const { currencySymbol, formatAmount } = useCurrency();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [isCustomCustomer, setIsCustomCustomer] = useState(true);
  const [linkedCustomerId, setLinkedCustomerId] = useState('');

  // Custom Customer Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Line Items
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const { data } = await axiosInstance.get(`/custom-invoicing/invoices/${id}`);
      if (data.success) {
        const inv = data.data;
        setInvoice(inv);
        setIsCustomCustomer(Boolean(inv.isCustomCustomer));
        setLinkedCustomerId(inv.customer?._id || '');
        
        // Block edit if paid
        if (inv.status === 'paid' || inv.amountPaid > 0) {
           Alert.alert('Notice', 'Invoices with payments applied cannot be edited. Please go back.');
        }

        if (inv.isCustomCustomer) {
          setCustomerName(inv.customCustomer?.name || '');
          setCustomerPhone(inv.customCustomer?.phone || '');
          setCustomerEmail(inv.customCustomer?.email || '');
        } else {
          setCustomerName(inv.customer?.name || '');
          setCustomerPhone(inv.customer?.phone || '');
          setCustomerEmail(inv.customer?.email || '');
        }

        // Format existing line items pulling deeply linked unit and item tax rate
        const formattedItems = inv.lineItems.map(i => ({
          description: i.description || i.product?.name || '',
          quantity: (i.quantity || 1).toString(),
          unit: i.unit || '',
          unitPrice: (i.unitPrice || 0).toString(),
          taxRate: (i.taxRate || 0).toString()
        }));
        
        setItems(formattedItems.length ? formattedItems : [{ description: '', quantity: '1', unit: '', unitPrice: '0', taxRate: '0' }]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch invoice details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: '1', unit: '', unitPrice: '0', taxRate: '0' }]);
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
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      const t = parseFloat(item.taxRate) || 0;
      const amount = q * p;
      const itemTax = (amount * t) / 100;
      
      subtotal += amount;
      taxAmount += itemTax;
    });

    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async () => {
    if (invoice?.status === 'paid' || invoice?.amountPaid > 0) {
      Alert.alert('Error', 'Cannot edit a partially or fully paid invoice.');
      return;
    }

    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Validation Error', 'At least one item is required.');
      return;
    }

    const invalidItem = items.find(i => !i.description.trim() || parseFloat(i.quantity) <= 0 || parseFloat(i.unitPrice) < 0);
    if (invalidItem) {
      Alert.alert('Validation Error', 'All items must have a Description, Quantity > 0, and Price >= 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedItems = items.map(i => {
        const qty = parseFloat(i.quantity) || 0;
        const price = parseFloat(i.unitPrice) || 0;
        const tax = parseFloat(i.taxRate) || 0;
        const itemTotal = qty * price;
        return {
          description: i.description,
          quantity: qty,
          unit: i.unit,
          unitPrice: price,
          taxRate: tax,
          taxAmount: (itemTotal * tax) / 100,
          totalAmount: itemTotal
        }
      });

      const totals = calculateTotals();
      
      const payload = {
        lineItems: formattedItems,
        subtotal: totals.subtotal,
        totalTax: totals.taxAmount,
        totalAmount: totals.totalAmount,
      };

      if (isCustomCustomer) {
        payload.isCustomCustomer = true;
        payload.customCustomer = {
          name: customerName,
          phone: customerPhone,
          email: customerEmail
        };
      } else {
        payload.isCustomCustomer = false;
        payload.customer = linkedCustomerId || undefined;
      }

      const { data } = await axiosInstance.put(`/custom-invoicing/invoices/${id}`, payload);
      
      if (data.success) {
        Alert.alert('Success', 'Invoice updated successfully');
        navigation.goBack(); 
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update invoice');
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

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Invoice</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting || invoice?.amountPaid > 0}>
          {isSubmitting ? (
            <ActivityIndicator color="#4f46e5" />
          ) : (
            <View style={[styles.saveBtn, { opacity: invoice?.amountPaid > 0 ? 0.5 : 1 }]}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Update</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bill To</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: '#f1f5f9', color: '#64748b' }]} 
              value={customerName} 
              editable={false}
            />
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
                <Text style={styles.label}>Description *</Text>
                <TextInput 
                  style={styles.input} 
                  value={item.description} 
                  onChangeText={(val) => handleChangeItem(index, 'description', val)} 
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
                  <Text style={styles.label}>Unit</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.unit} 
                    onChangeText={(val) => handleChangeItem(index, 'unit', val)}
                    placeholder="pcs, hr" 
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Price * ({currencySymbol.trim()})</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.unitPrice} 
                    onChangeText={(val) => handleChangeItem(index, 'unitPrice', val)} 
                    keyboardType="numeric" 
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}>
                  <Text style={styles.label}>Tax (%)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.taxRate} 
                    onChangeText={(val) => handleChangeItem(index, 'taxRate', val)} 
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

        <View style={styles.summaryCard}>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
          </View>
          <View style={styles.row}>
             <Text style={styles.summaryLabel}>Combined Tax:</Text>
             <Text style={styles.summaryValue}>{formatAmount(taxAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total:</Text>
            <Text style={styles.totalValue}>{formatAmount(totalAmount)}</Text>
          </View>
        </View>
        
        <View style={{height: 40}} />

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
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
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
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 4 },
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
