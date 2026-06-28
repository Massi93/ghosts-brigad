package com.dasshop.app.ui.screens.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dasshop.app.data.models.Product
import com.dasshop.app.data.repo.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class ProductState(
    val loading: Boolean = true,
    val product: Product? = null,
    val selectedSize: String? = null,
    val adding: Boolean = false,
    val added: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ProductViewModel @Inject constructor(private val repo: ShopRepository) : ViewModel() {
    private val _state = MutableStateFlow(ProductState())
    val state: StateFlow<ProductState> = _state.asStateFlow()

    fun load(slug: String) {
        _state.value = _state.value.copy(loading = true, error = null, added = false)
        viewModelScope.launch {
            runCatching { repo.getProduct(slug) }
                .onSuccess { _state.value = _state.value.copy(loading = false, product = it) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    fun selectSize(size: String) {
        _state.value = _state.value.copy(selectedSize = size)
    }

    fun addToCart(onRequiresLogin: () -> Unit) {
        val product = _state.value.product ?: return
        viewModelScope.launch {
            val loggedIn = repo.isLoggedIn.first()
            if (!loggedIn) {
                onRequiresLogin()
                return@launch
            }
            _state.value = _state.value.copy(adding = true, error = null)
            runCatching { repo.addToCart(product.id, _state.value.selectedSize) }
                .onSuccess { _state.value = _state.value.copy(adding = false, added = true) }
                .onFailure { _state.value = _state.value.copy(adding = false, error = it.message) }
        }
    }
}
