package com.dasshop.app.ui.screens.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onLoginRequired: () -> Unit, vm: ProfileViewModel = hiltViewModel()) {
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("ACCOUNT", style = MaterialTheme.typography.titleLarge) }) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (state.loggedIn) {
                    Text("You are logged in", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(24.dp))
                    OutlinedButton(
                        onClick = { vm.logout() },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = MaterialTheme.shapes.extraSmall,
                    ) {
                        Text("LOG OUT", style = MaterialTheme.typography.labelLarge)
                    }
                } else {
                    Text("Sign in to view orders and manage your account.", style = MaterialTheme.typography.bodyLarge)
                    Spacer(Modifier.height(24.dp))
                    Button(
                        onClick = onLoginRequired,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = MaterialTheme.shapes.extraSmall,
                    ) {
                        Text("LOG IN OR CREATE", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
    }
}
