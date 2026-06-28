package com.dasshop.app.ui.nav

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

private data class BottomItem(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val items = listOf(
    BottomItem(Routes.HOME, "Shop", Icons.Outlined.Home),
    BottomItem(Routes.CART, "Bag", Icons.Outlined.ShoppingBag),
    BottomItem(Routes.PROFILE, "Account", Icons.Outlined.AccountCircle),
)

@Composable
fun BottomBar(currentRoute: String?, onNavigate: (String) -> Unit) {
    NavigationBar {
        items.forEach { item ->
            NavigationBarItem(
                selected = currentRoute == item.route,
                onClick = { onNavigate(item.route) },
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
            )
        }
    }
}
