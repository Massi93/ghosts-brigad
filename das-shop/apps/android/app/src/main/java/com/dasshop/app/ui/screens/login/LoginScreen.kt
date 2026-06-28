package com.dasshop.app.ui.screens.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun LoginScreen(onDone: () -> Unit, vm: LoginViewModel = hiltViewModel()) {
    val state by vm.state.collectAsState()

    LaunchedEffect(state.success) { if (state.success) onDone() }

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            if (state.mode == AuthMode.LOGIN) "LOG IN" else "CREATE ACCOUNT",
            style = MaterialTheme.typography.headlineLarge,
        )
        Spacer(Modifier.height(32.dp))

        if (state.mode == AuthMode.REGISTER) {
            OutlinedTextField(
                value = state.name,
                onValueChange = vm::setName,
                label = { Text("Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
        }

        OutlinedTextField(
            value = state.email,
            onValueChange = vm::setEmail,
            label = { Text("Email") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = state.password,
            onValueChange = vm::setPassword,
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
        )

        state.error?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { vm.submit() },
            enabled = !state.loading && state.email.isNotBlank() && state.password.length >= 8,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = MaterialTheme.shapes.extraSmall,
        ) {
            Text(
                if (state.loading) "…" else if (state.mode == AuthMode.LOGIN) "LOG IN" else "CREATE",
                style = MaterialTheme.typography.labelLarge,
            )
        }

        Spacer(Modifier.height(12.dp))
        TextButton(onClick = vm::toggleMode, modifier = Modifier.fillMaxWidth()) {
            Text(
                if (state.mode == AuthMode.LOGIN) "No account? Create one"
                else "Already have an account? Log in",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}
