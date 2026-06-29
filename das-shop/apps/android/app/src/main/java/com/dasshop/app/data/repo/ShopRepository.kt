package com.dasshop.app.data.repo

import com.dasshop.app.data.api.DasShopApi
import com.dasshop.app.data.auth.AuthStore
import com.dasshop.app.data.models.AddToCartBody
import com.dasshop.app.data.models.AuthUser
import com.dasshop.app.data.models.Cart
import com.dasshop.app.data.models.Category
import com.dasshop.app.data.models.LoginBody
import com.dasshop.app.data.models.Product
import com.dasshop.app.data.models.ProductList
import com.dasshop.app.data.models.RegisterBody
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class ShopRepository @Inject constructor(
    private val api: DasShopApi,
    private val authStore: AuthStore,
) {
    val isLoggedIn: Flow<Boolean> = authStore.tokenFlow.map { it != null }

    suspend fun listProducts(
        category: String? = null,
        search: String? = null,
        sort: String = "newest",
        featured: Boolean? = null,
        limit: Int = 24,
    ): ProductList = api.listProducts(category, search, sort, featured, limit)

    suspend fun getProduct(slug: String): Product = api.getProduct(slug)

    suspend fun listCategories(): List<Category> = api.listCategories()

    suspend fun login(email: String, password: String): AuthUser {
        val res = api.login(LoginBody(email, password))
        authStore.save(res.token)
        return res.user
    }

    suspend fun register(email: String, password: String, name: String?): AuthUser {
        val res = api.register(RegisterBody(email, password, name))
        authStore.save(res.token)
        return res.user
    }

    suspend fun logout() = authStore.clear()

    suspend fun getCart(): Cart = api.getCart()

    suspend fun addToCart(productId: String, size: String?): Cart =
        api.addToCart(AddToCartBody(productId = productId, size = size))
}
