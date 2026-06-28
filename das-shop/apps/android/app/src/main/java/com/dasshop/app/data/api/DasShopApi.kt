package com.dasshop.app.data.api

import com.dasshop.app.data.models.AddToCartBody
import com.dasshop.app.data.models.AuthResponse
import com.dasshop.app.data.models.Cart
import com.dasshop.app.data.models.Category
import com.dasshop.app.data.models.LoginBody
import com.dasshop.app.data.models.Product
import com.dasshop.app.data.models.ProductList
import com.dasshop.app.data.models.RegisterBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface DasShopApi {

    @GET("products")
    suspend fun listProducts(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("sort") sort: String? = "newest",
        @Query("featured") featured: Boolean? = null,
        @Query("limit") limit: Int = 24,
        @Query("offset") offset: Int = 0,
    ): ProductList

    @GET("products/{slug}")
    suspend fun getProduct(@Path("slug") slug: String): Product

    @GET("categories")
    suspend fun listCategories(): List<Category>

    @POST("auth/login")
    suspend fun login(@Body body: LoginBody): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterBody): AuthResponse

    @GET("cart")
    suspend fun getCart(): Cart

    @POST("cart/items")
    suspend fun addToCart(@Body body: AddToCartBody): Cart
}
