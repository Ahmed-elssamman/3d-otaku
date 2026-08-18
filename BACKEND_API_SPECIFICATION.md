# 3D OTAKU - Backend REST API Specification (Cart & Orders)

This document provides the complete API specification for Cart & Order endpoints to be implemented by the backend developer.

Base URL Prefix: `/api`

---

## 1. Cart Endpoints

### 1.1 Get Customer Cart
- **Endpoint**: `GET /api/cart`
- **Authentication**: Optional / Session / Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Cart retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "item_101",
        "productId": "64b1f92e01a",
        "name": "Demon Dagger 3D Model",
        "image": "https://images.unsplash.com/photo-...",
        "category": "Anime Weapons",
        "unitPrice": 450,
        "quantity": 2,
        "lineTotal": 900
      }
    ],
    "itemCount": 2,
    "subtotal": 900
  }
}
```

### 1.2 Add Item to Cart
- **Endpoint**: `POST /api/cart/items`
- **Request Body**:
```json
{
  "productId": "64b1f92e01a",
  "quantity": 1
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Item added to cart.",
  "data": {
    "items": [ ... ],
    "itemCount": 1,
    "subtotal": 450
  }
}
```

### 1.3 Update Item Quantity
- **Endpoint**: `PUT /api/cart/items/:itemId`
- **Request Body**:
```json
{
  "quantity": 3
}
```

### 1.4 Delete Item from Cart
- **Endpoint**: `DELETE /api/cart/items/:itemId`

### 1.5 Clear Cart
- **Endpoint**: `DELETE /api/cart/clear`

---

## 2. Order Endpoints

### 2.1 Create New Order (Checkout)
- **Endpoint**: `POST /api/orders`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "items": [
    {
      "productId": "64b1f92e01a",
      "productName": "Demon Dagger 3D Model",
      "productImage": "https://images.unsplash.com/photo-...",
      "quantity": 2,
      "unitPrice": 450,
      "lineTotal": 900
    }
  ],
  "customer": {
    "fullName": "Ahmed Samir",
    "phone": "01112961724",
    "secondaryPhone": "01012345678",
    "governorate": "Cairo - Madinaty",
    "address": "Street 10, Building 4, Apt 12",
    "notes": "Please call before arrival"
  },
  "subtotal": 900,
  "deliveryFee": 60,
  "totalAmount": 960,
  "deliveryDays": "3 - 5 Business Days"
}
```

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Order created successfully.",
  "data": {
    "id": "ord_65c89f0a21",
    "orderNumber": "ORD-849201",
    "status": "pending",
    "items": [
      {
        "productId": "64b1f92e01a",
        "productName": "Demon Dagger 3D Model",
        "productImage": "https://images.unsplash.com/photo-...",
        "quantity": 2,
        "unitPrice": 450,
        "lineTotal": 900
      }
    ],
    "customer": {
      "fullName": "Ahmed Samir",
      "phone": "01112961724",
      "secondaryPhone": "01012345678",
      "governorate": "Cairo - Madinaty",
      "address": "Street 10, Building 4, Apt 12",
      "notes": "Please call before arrival"
    },
    "subtotal": 900,
    "deliveryFee": 60,
    "totalAmount": 960,
    "estimatedDeliveryDays": "3 - 5 Business Days",
    "createdAt": "2026-08-05T18:05:00.000Z",
    "whatsappMessageSent": true
  }
}
```

---

### 2.2 List User Orders
- **Endpoint**: `GET /api/orders`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Orders fetched successfully.",
  "data": [
    {
      "id": "ord_65c89f0a21",
      "orderNumber": "ORD-849201",
      "status": "pending",
      "items": [ ... ],
      "customer": { ... },
      "subtotal": 900,
      "deliveryFee": 60,
      "totalAmount": 960,
      "estimatedDeliveryDays": "3 - 5 Business Days",
      "createdAt": "2026-08-05T18:05:00.000Z"
    }
  ]
}
```

---

### 2.3 Track Order by Order Number
- **Endpoint**: `GET /api/orders/track/:orderNumber`
- **Example**: `GET /api/orders/track/ORD-849201`
- **Response `200 OK`**: Returns order details matching the given `orderNumber`.

---

### 2.4 Admin - List All Orders
- **Endpoint**: `GET /api/admin/orders`
- **Response `200 OK`**: List of all customer orders in the system.

---

### 2.5 Admin - Update Order Status
- **Endpoint**: `PATCH /api/admin/orders/:id/status`
- **Request Body**:
```json
{
  "status": "processing"
}
```
- **Allowed Status Enum**:
  - `pending`
  - `processing`
  - `printed`
  - `shipped`
  - `delivered`
  - `cancelled`
