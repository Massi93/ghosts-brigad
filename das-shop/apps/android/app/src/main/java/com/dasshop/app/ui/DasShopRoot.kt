package com.dasshop.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.dasshop.app.ui.nav.BottomBar
import com.dasshop.app.ui.nav.Routes
import com.dasshop.app.ui.screens.cart.CartScreen
import com.dasshop.app.ui.screens.catalog.CatalogScreen
import com.dasshop.app.ui.screens.home.HomeScreen
import com.dasshop.app.ui.screens.login.LoginScreen
import com.dasshop.app.ui.screens.product.ProductScreen
import com.dasshop.app.ui.screens.profile.ProfileScreen

@Composable
fun DasShopRoot() {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            if (currentRoute in Routes.bottomBarRoutes) {
                BottomBar(currentRoute = currentRoute, onNavigate = { route ->
                    nav.navigate(route) {
                        popUpTo(Routes.HOME) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                })
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            NavHost(navController = nav, startDestination = Routes.HOME) {
                composable(Routes.HOME) {
                    HomeScreen(onProductClick = { nav.navigate(Routes.product(it)) },
                        onCategoryClick = { nav.navigate(Routes.catalog(it)) })
                }
                composable(Routes.CATALOG_PATTERN) { entry ->
                    val slug = entry.arguments?.getString("slug") ?: ""
                    CatalogScreen(slug = slug, onProductClick = { nav.navigate(Routes.product(it)) },
                        onBack = { nav.popBackStack() })
                }
                composable(Routes.PRODUCT_PATTERN) { entry ->
                    val slug = entry.arguments?.getString("slug") ?: ""
                    ProductScreen(slug = slug, onBack = { nav.popBackStack() },
                        onLoginRequired = { nav.navigate(Routes.LOGIN) })
                }
                composable(Routes.CART) {
                    CartScreen(onLoginRequired = { nav.navigate(Routes.LOGIN) })
                }
                composable(Routes.PROFILE) {
                    ProfileScreen(onLoginRequired = { nav.navigate(Routes.LOGIN) })
                }
                composable(Routes.LOGIN) {
                    LoginScreen(onDone = { nav.popBackStack() })
                }
            }
        }
    }
}
