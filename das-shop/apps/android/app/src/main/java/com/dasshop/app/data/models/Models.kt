package com.dasshop.app.data.models

import kotlinx.serialization.Serializable

@Serializable
data class Category(
    val id: String,
    val slug: String,
    val name: String,
    val productCount: Int = 0,
)

@Serializable
data class Product(
    val id: String,
    val slug: String,
    val name: String,
    val description: String,
    val priceCents: Int,
    val currency: String = "EUR",
    val imageUrl: String,
    val stock: Int = 0,
    val featured: Boolean = false,
    val categoryId: String,
    val category: Category? = null,
)

@Serializable
data class ProductList(
    val items: List<Product>,
    val total: Int,
    val limit: Int,
    val offset: Int,
)

@Serializable
data class CartItem(
    val id: String,
    val quantity: Int,
    val size: String? = null,
    val product: Product,
)

@Serializable
data class Cart(
    val id: String,
    val items: List<CartItem>,
    val subtotalCents: Int,
    val currency: String,
    val itemCount: Int,
)

@Serializable
data class AuthUser(
    val id: String,
    val email: String,
    val name: String? = null,
    val role: String,
)

@Serializable
data class AuthResponse(val user: AuthUser, val token: String)

@Serializable
data class LoginBody(val email: String, val password: String)

@Serializable
data class RegisterBody(val email: String, val password: String, val name: String? = null)

@Serializable
data class AddToCartBody(val productId: String, val quantity: Int = 1, val size: String? = null)
