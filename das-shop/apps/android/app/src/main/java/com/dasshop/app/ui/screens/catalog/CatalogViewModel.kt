package com.dasshop.app.ui.screens.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dasshop.app.data.models.Product
import com.dasshop.app.data.repo.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CatalogState(
    val loading: Boolean = true,
    val title: String = "",
    val products: List<Product> = emptyList(),
)

@HiltViewModel
class CatalogViewModel @Inject constructor(private val repo: ShopRepository) : ViewModel() {
    private val _state = MutableStateFlow(CatalogState())
    val state: StateFlow<CatalogState> = _state.asStateFlow()

    fun load(slug: String) {
        _state.value = _state.value.copy(loading = true)
        viewModelScope.launch {
            runCatching {
                val cats = repo.listCategories()
                val list = repo.listProducts(category = slug, limit = 48)
                _state.value = CatalogState(
                    loading = false,
                    title = cats.firstOrNull { it.slug == slug }?.name ?: slug,
                    products = list.items,
                )
            }.onFailure {
                _state.value = CatalogState(loading = false, title = slug)
            }
        }
    }
}
