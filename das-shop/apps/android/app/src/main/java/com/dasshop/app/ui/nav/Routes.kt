package com.dasshop.app.ui.nav

object Routes {
    const val HOME = "home"
    const val CART = "cart"
    const val PROFILE = "profile"
    const val LOGIN = "login"

    const val CATALOG_PATTERN = "catalog/{slug}"
    fun catalog(slug: String) = "catalog/$slug"

    const val PRODUCT_PATTERN = "product/{slug}"
    fun product(slug: String) = "product/$slug"

    val bottomBarRoutes = setOf(HOME, CART, PROFILE)
}
