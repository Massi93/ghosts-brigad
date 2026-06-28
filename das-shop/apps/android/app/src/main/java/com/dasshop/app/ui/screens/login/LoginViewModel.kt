package com.dasshop.app.ui.screens.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dasshop.app.data.repo.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class AuthMode { LOGIN, REGISTER }

data class LoginState(
    val mode: AuthMode = AuthMode.LOGIN,
    val email: String = "",
    val password: String = "",
    val name: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

@HiltViewModel
class LoginViewModel @Inject constructor(private val repo: ShopRepository) : ViewModel() {
    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    fun setEmail(v: String) { _state.value = _state.value.copy(email = v) }
    fun setPassword(v: String) { _state.value = _state.value.copy(password = v) }
    fun setName(v: String) { _state.value = _state.value.copy(name = v) }
    fun toggleMode() {
        _state.value = _state.value.copy(
            mode = if (_state.value.mode == AuthMode.LOGIN) AuthMode.REGISTER else AuthMode.LOGIN,
            error = null,
        )
    }

    fun submit() {
        val s = _state.value
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching {
                if (s.mode == AuthMode.LOGIN) repo.login(s.email, s.password)
                else repo.register(s.email, s.password, s.name.ifBlank { null })
            }
                .onSuccess { _state.value = _state.value.copy(loading = false, success = true) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message ?: "error") }
        }
    }
}
