package com.dasshop.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dasshop.app.data.repo.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class ProfileState(val loggedIn: Boolean = false, val loading: Boolean = true)

@HiltViewModel
class ProfileViewModel @Inject constructor(private val repo: ShopRepository) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            val loggedIn = repo.isLoggedIn.first()
            _state.value = ProfileState(loggedIn = loggedIn, loading = false)
        }
    }

    fun logout() {
        viewModelScope.launch {
            repo.logout()
            refresh()
        }
    }
}
