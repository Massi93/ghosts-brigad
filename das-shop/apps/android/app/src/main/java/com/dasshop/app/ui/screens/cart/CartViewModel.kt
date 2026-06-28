package com.dasshop.app.ui.screens.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dasshop.app.data.models.Cart
import com.dasshop.app.data.repo.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class CartState(
    val loading: Boolean = true,
    val loggedIn: Boolean = false,
    val cart: Cart? = null,
    val error: String? = null,
)

@HiltViewModel
class CartViewModel @Inject constructor(private val repo: ShopRepository) : ViewModel() {
    private val _state = MutableStateFlow(CartState())
    val state: StateFlow<CartState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            val loggedIn = repo.isLoggedIn.first()
            if (!loggedIn) {
                _state.value = CartState(loading = false, loggedIn = false)
                return@launch
            }
            runCatching { repo.getCart() }
                .onSuccess { _state.value = CartState(loading = false, loggedIn = true, cart = it) }
                .onFailure { _state.value = CartState(loading = false, loggedIn = true, error = it.message) }
        }
    }
}
