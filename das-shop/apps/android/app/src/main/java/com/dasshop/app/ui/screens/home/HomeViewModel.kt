package com.dasshop.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dasshop.app.data.models.Category
import com.dasshop.app.data.models.Product
import com.dasshop.app.data.repo.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeState(
    val loading: Boolean = true,
    val featured: List<Product> = emptyList(),
    val categories: List<Category> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(private val repo: ShopRepository) : ViewModel() {
    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching {
                val featured = repo.listProducts(featured = true).items
                val categories = repo.listCategories()
                _state.value = HomeState(loading = false, featured = featured, categories = categories)
            }.onFailure { e ->
                _state.value = HomeState(loading = false, error = e.message ?: "error")
            }
        }
    }
}
