const { randomUUID: uuidv4 } = require('crypto');

// PURCHASE TYPES
const PURCHASE_TYPES = {
  EXTERNAL: 'external', // From outside vendor
  INTER_DEPARTMENT: 'inter_department', // Between departments
  INTER_HOSPITAL: 'inter_hospital' // Between hospitals
};

// MOCK PURCHASES DATABASE
const mockPurchases = [
  {
    id: '00000000-0000-0000-0000-000000000p01',
    purchaseType: 'external', // external, inter_department, inter_hospital
    purchaseNumber: 'PUR-2026-0001',
    
    // For External Purchases
    vendorName: 'Medical Plus Suppliers',
    vendorId: null,
    
    // For Inter-Department
    fromDepartment: null,
    toDepartment: null,
    
    // For Inter-Hospital
    fromHospitalId: null,
    fromHospitalName: null,
    toHospitalId: null,
    toHospitalName: null,
    
    items: [
      {
        id: uuidv4(),
        itemName: 'Paracetamol 500mg',
        itemType: 'medicine', // medicine, equipment, supplies
        quantity: 100,
        unit: 'tablets',
        unitPrice: 50,
        totalPrice: 5000
      }
    ],
    
    totalAmount: 5000,
    taxAmount: 900,
    finalAmount: 5900,
    
    status: 'pending', // pending, approved, received, completed, cancelled
    paymentStatus: 'unpaid', // unpaid, partial, paid
    
    purchaseDate: '2026-06-20',
    expectedDeliveryDate: '2026-06-25',
    actualDeliveryDate: null,
    
    approvedBy: 'Admin User',
    receivedBy: null,
    
    notes: 'Emergency purchase for stock refill',
    
    createdAt: new Date()
  }
];

// MOCK VENDORS
const mockVendors = [
  {
    id: '00000000-0000-0000-0000-000000000v01',
    name: 'Medical Plus Suppliers',
    type: 'pharmacy', // pharmacy, medical_equipment, general_supplies
    contactPerson: 'John Smith',
    email: 'contact@medicalplus.com',
    phone: '9876543210',
    address: 'Mumbai, India',
    bankAccount: 'ABC123456',
    isActive: true
  }
];

// MOCK DEPARTMENTS
const mockDepartments = [
  {
    id: '00000000-0000-0000-0000-000000000dep01',
    name: 'Cardiology',
    headOfDepartment: 'Dr. Rajesh Verma'
  },
  {
    id: '00000000-0000-0000-0000-000000000dep02',
    name: 'Pediatrics',
    headOfDepartment: 'Dr. Priya Sharma'
  },
  {
    id: '00000000-0000-0000-0000-000000000dep03',
    name: 'General Medicine',
    headOfDepartment: 'Dr. Arvind Kumar'
  }
];

class PurchaseService {
  // EXTERNAL PURCHASES (From vendors)
  static async createExternalPurchase({
    vendorId,
    vendorName,
    items,
    expectedDeliveryDate,
    notes
  }) {
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = totalAmount * 0.18; // 18% GST
    const finalAmount = totalAmount + taxAmount;

    const newPurchase = {
      id: uuidv4(),
      purchaseType: PURCHASE_TYPES.EXTERNAL,
      purchaseNumber: `PUR-2026-${String(mockPurchases.length + 1).padStart(4, '0')}`,
      
      vendorName: vendorName || mockVendors.find(v => v.id === vendorId)?.name,
      vendorId,
      
      fromDepartment: null,
      toDepartment: null,
      fromHospitalId: null,
      fromHospitalName: null,
      toHospitalId: null,
      toHospitalName: null,
      
      items: items.map(item => ({ ...item, id: uuidv4() })),
      
      totalAmount,
      taxAmount,
      finalAmount,
      
      status: 'pending',
      paymentStatus: 'unpaid',
      
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate,
      actualDeliveryDate: null,
      
      approvedBy: null,
      receivedBy: null,
      
      notes,
      
      createdAt: new Date()
    };

    mockPurchases.push(newPurchase);
    return newPurchase;
  }

  // INTER-DEPARTMENT TRANSFERS
  static async createInterDepartmentTransfer({
    fromDepartmentId,
    toDepartmentId,
    items,
    notes
  }) {
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = 0; // No tax for internal transfers
    const finalAmount = totalAmount;

    const fromDept = mockDepartments.find(d => d.id === fromDepartmentId);
    const toDept = mockDepartments.find(d => d.id === toDepartmentId);

    const newPurchase = {
      id: uuidv4(),
      purchaseType: PURCHASE_TYPES.INTER_DEPARTMENT,
      purchaseNumber: `IDT-2026-${String(mockPurchases.length + 1).padStart(4, '0')}`,
      
      vendorName: null,
      vendorId: null,
      
      fromDepartment: fromDept?.name,
      toDepartment: toDept?.name,
      fromHospitalId: null,
      fromHospitalName: null,
      toHospitalId: null,
      toHospitalName: null,
      
      items: items.map(item => ({ ...item, id: uuidv4() })),
      
      totalAmount,
      taxAmount,
      finalAmount,
      
      status: 'pending',
      paymentStatus: 'paid', // Inter-department transfers are automatically "paid"
      
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      actualDeliveryDate: null,
      
      approvedBy: null,
      receivedBy: null,
      
      notes: `Transfer from ${fromDept?.name} to ${toDept?.name}. ${notes}`,
      
      createdAt: new Date()
    };

    mockPurchases.push(newPurchase);
    return newPurchase;
  }

  // INTER-HOSPITAL TRANSFERS
  static async createInterHospitalTransfer({
    fromHospitalId,
    fromHospitalName,
    toHospitalId,
    toHospitalName,
    items,
    notes
  }) {
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = 0; // No tax for inter-hospital transfers
    const finalAmount = totalAmount;

    const newPurchase = {
      id: uuidv4(),
      purchaseType: PURCHASE_TYPES.INTER_HOSPITAL,
      purchaseNumber: `IHT-2026-${String(mockPurchases.length + 1).padStart(4, '0')}`,
      
      vendorName: null,
      vendorId: null,
      
      fromDepartment: null,
      toDepartment: null,
      fromHospitalId,
      fromHospitalName,
      toHospitalId,
      toHospitalName,
      
      items: items.map(item => ({ ...item, id: uuidv4() })),
      
      totalAmount,
      taxAmount,
      finalAmount,
      
      status: 'pending',
      paymentStatus: 'pending', // Depends on agreement
      
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      actualDeliveryDate: null,
      
      approvedBy: null,
      receivedBy: null,
      
      notes: `Transfer from ${fromHospitalName} to ${toHospitalName}. ${notes}`,
      
      createdAt: new Date()
    };

    mockPurchases.push(newPurchase);
    return newPurchase;
  }

  // COMMON PURCHASE OPERATIONS
  static async getAllPurchases(limit = 50, offset = 0) {
    return mockPurchases.slice(offset, offset + limit);
  }

  static async getPurchaseById(id) {
    return mockPurchases.find(p => p.id === id) || null;
  }

  static async getPurchasesByType(type) {
    return mockPurchases.filter(p => p.purchaseType === type);
  }

  static async getPurchasesByStatus(status) {
    return mockPurchases.filter(p => p.status === status);
  }

  static async approvePurchase(purchaseId, approvedBy) {
    const purchase = mockPurchases.find(p => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    purchase.status = 'approved';
    purchase.approvedBy = approvedBy;
    return purchase;
  }

  static async receivePurchase(purchaseId, receivedBy) {
    const purchase = mockPurchases.find(p => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    purchase.status = 'received';
    purchase.actualDeliveryDate = new Date().toISOString().split('T')[0];
    purchase.receivedBy = receivedBy;
    return purchase;
  }

  static async completePurchase(purchaseId) {
    const purchase = mockPurchases.find(p => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    purchase.status = 'completed';
    return purchase;
  }

  static async cancelPurchase(purchaseId, reason) {
    const purchase = mockPurchases.find(p => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    purchase.status = 'cancelled';
    purchase.notes += ` [CANCELLED: ${reason}]`;
    return purchase;
  }

  // VENDORS
  static async getAllVendors() {
    return mockVendors;
  }

  static async getVendorById(id) {
    return mockVendors.find(v => v.id === id) || null;
  }

  // DEPARTMENTS
  static async getAllDepartments() {
    return mockDepartments;
  }

  // ANALYTICS
  static async getPurchaseAnalytics(purchaseType = null) {
    let purchases = mockPurchases;
    
    if (purchaseType) {
      purchases = purchases.filter(p => p.purchaseType === purchaseType);
    }

    const byStatus = {};
    const byType = {};
    
    purchases.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byType[p.purchaseType] = (byType[p.purchaseType] || 0) + 1;
    });

    const totalAmount = purchases.reduce((sum, p) => sum + p.finalAmount, 0);

    return {
      totalPurchases: purchases.length,
      totalAmount,
      byStatus,
      byType,
      averageAmount: (totalAmount / purchases.length).toFixed(2)
    };
  }
}

module.exports = PurchaseService;