package com.dasshop.app.ui.screens.cart

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.dasshop.app.ui.components.formatPrice

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(onLoginRequired: () -> Unit, vm: CartViewModel = hiltViewModel()) {
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("YOUR BAG", style = MaterialTheme.typography.titleLarge) })
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                !state.loggedIn -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Log in to see your bag", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = onLoginRequired) { Text("LOG IN") }
                }
                state.cart?.items.isNullOrEmpty() -> Column(
                    Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Your bag is empty", style = MaterialTheme.typography.titleMedium)
                }
                else -> {
                    val cart = state.cart!!
                    Column(Modifier.fillMaxSize()) {
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            items(cart.items) { item ->
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(
                                        Modifier
                                            .width(80.dp)
                                            .height(110.dp)
                                            .background(MaterialTheme.colorScheme.surfaceVariant)
                                    ) {
                                        AsyncImage(
                                            model = item.product.imageUrl,
                                            contentDescription = item.product.name,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize(),
                                        )
                                    }
                                    Column(Modifier.weight(1f)) {
                                        Text(item.product.name, style = MaterialTheme.typography.bodyLarge)
                                        item.size?.let {
                                            Text("Size $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Text("Qty ${item.quantity}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text(
                                        formatPrice(item.product.priceCents * item.quantity, item.product.currency),
                                        style = MaterialTheme.typography.titleMedium,
                                    )
                                }
                            }
                        }
                        HorizontalDivider()
                        Column(Modifier.padding(16.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("TOTAL", style = MaterialTheme.typography.labelLarge)
                                Text(
                                    formatPrice(cart.subtotalCents, cart.currency),
                                    style = MaterialTheme.typography.titleLarge,
                                )
                            }
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { /* TODO: checkout */ },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = MaterialTheme.shapes.extraSmall,
                            ) {
                                Text("CHECKOUT", style = MaterialTheme.typography.labelLarge)
                            }
                        }
                    }
                }
            }
        }
    }
}
