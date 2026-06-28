package com.dasshop.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val Ink = Color(0xFF0A0A0A)
private val Paper = Color(0xFFFAFAFA)
private val Muted = Color(0xFF6B7280)
private val Accent = Color(0xFFFF4D2E)
private val Line = Color(0xFFE5E5E5)

private val LightColors = lightColorScheme(
    primary = Ink,
    onPrimary = Paper,
    secondary = Accent,
    onSecondary = Paper,
    background = Paper,
    onBackground = Ink,
    surface = Paper,
    onSurface = Ink,
    surfaceVariant = Color(0xFFF2F2F2),
    onSurfaceVariant = Muted,
    outline = Line,
)

private val DarkColors = darkColorScheme(
    primary = Paper,
    onPrimary = Ink,
    secondary = Accent,
    onSecondary = Paper,
    background = Ink,
    onBackground = Paper,
    surface = Color(0xFF111111),
    onSurface = Paper,
    surfaceVariant = Color(0xFF1C1C1C),
    onSurfaceVariant = Color(0xFFB3B3B3),
    outline = Color(0xFF2A2A2A),
)

val DasTypography = Typography(
    displayLarge = TextStyle(fontWeight = FontWeight.Black, fontSize = 56.sp, letterSpacing = (-0.5).sp),
    headlineLarge = TextStyle(fontWeight = FontWeight.Black, fontSize = 28.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 18.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 15.sp),
    bodyLarge = TextStyle(fontSize = 15.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontSize = 13.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp, letterSpacing = 1.8.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 1.5.sp),
)

@Composable
fun DasShopTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = DasTypography,
        content = content,
    )
}
