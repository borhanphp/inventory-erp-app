import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/Auth/LoginScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import QuotationListScreen from '../screens/Sales/QuotationListScreen';
import QuotationDetailScreen from '../screens/Sales/QuotationDetailScreen';
import QuotationCreateScreen from '../screens/Sales/QuotationCreateScreen';
import QuotationEditScreen from '../screens/Sales/QuotationEditScreen';

import InvoiceListScreen from '../screens/Sales/InvoiceListScreen';
import InvoiceDetailScreen from '../screens/Sales/InvoiceDetailScreen';
import InvoiceCreateScreen from '../screens/Sales/InvoiceCreateScreen';
import InvoiceEditScreen from '../screens/Sales/InvoiceEditScreen';

import ProductListScreen from '../screens/Inventory/ProductListScreen';
import ProductDetailScreen from '../screens/Inventory/ProductDetailScreen';
import ProductCreateScreen from '../screens/Inventory/ProductCreateScreen';
import ProductEditScreen from '../screens/Inventory/ProductEditScreen';
import DeliveryListScreen from '../screens/Delivery/DeliveryListScreen';
import DeliveryDetailScreen from '../screens/Delivery/DeliveryDetailScreen';
import DeliveryCreateScreen from '../screens/Delivery/DeliveryCreateScreen';
import OrderListScreen from '../screens/Sales/OrderListScreen';
import OrderDetailScreen from '../screens/Sales/OrderDetailScreen';
import OrderCreateScreen from '../screens/Sales/OrderCreateScreen';
import OrderEditScreen from '../screens/Sales/OrderEditScreen';
import SalesInvoiceDetailScreen from '../screens/Sales/SalesInvoiceDetailScreen';
import CustomerListScreen from '../screens/Customers/CustomerListScreen';
import CustomerDetailScreen from '../screens/Customers/CustomerDetailScreen';
import CustomerCreateScreen from '../screens/Customers/CustomerCreateScreen';
import CustomerEditScreen from '../screens/Customers/CustomerEditScreen';
import CustomerLedgerScreen from '../screens/Customers/CustomerLedgerScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          // Auth Stack
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="QuotationList" component={QuotationListScreen} />
            <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
            <Stack.Screen name="QuotationCreate" component={QuotationCreateScreen} />
            <Stack.Screen name="QuotationEdit" component={QuotationEditScreen} />

            <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
            <Stack.Screen name="InvoiceCreate" component={InvoiceCreateScreen} />
            <Stack.Screen name="InvoiceEdit" component={InvoiceEditScreen} />

            <Stack.Screen name="ProductList" component={ProductListScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="ProductCreate" component={ProductCreateScreen} />
            <Stack.Screen name="ProductEdit" component={ProductEditScreen} />
            <Stack.Screen name="DeliveryList" component={DeliveryListScreen} />
            <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
            <Stack.Screen name="DeliveryCreate" component={DeliveryCreateScreen} />

            <Stack.Screen name="OrderList" component={OrderListScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="OrderCreate" component={OrderCreateScreen} />
            <Stack.Screen name="OrderEdit" component={OrderEditScreen} />
            <Stack.Screen name="SalesInvoiceDetail" component={SalesInvoiceDetailScreen} />

            <Stack.Screen name="CustomerList" component={CustomerListScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="CustomerCreate" component={CustomerCreateScreen} />
            <Stack.Screen name="CustomerEdit" component={CustomerEditScreen} />
            <Stack.Screen name="CustomerLedger" component={CustomerLedgerScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
