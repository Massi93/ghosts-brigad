# das-shop — Android

Native Android app, Kotlin + Jetpack Compose + Material 3.

## Build & run

1. Open `apps/android` in **Android Studio Hedgehog or newer**.
2. Let Gradle sync (downloads AGP 8.7.x, Compose BOM 2024.12, Hilt 2.52, Retrofit 2.11, Coil 2.7).
3. Start the API in another terminal (`npm run dev:api` from the monorepo root). The app expects it at `http://10.0.2.2:4000` from the standard Android emulator (that loops back to your dev host).
4. Run the `app` configuration on an emulator (API 26+) or a physical device.

### Physical device note

`10.0.2.2` is the emulator-only shortcut to the host. On a physical device, edit `app/build.gradle.kts` and change the `API_BASE_URL` buildConfigField to your machine's LAN IP, e.g. `http://192.168.1.42:4000/`. The API CORS config already allows that pattern.

## Module layout

```
app/src/main/java/com/dasshop/app/
├── DasShopApp.kt          Hilt application
├── MainActivity.kt        Compose entry
├── data/
│   ├── api/               Retrofit interface + auth interceptor
│   ├── auth/              DataStore-backed token storage
│   ├── models/            Serializable DTOs
│   └── repo/              ShopRepository
├── di/                    Hilt modules
└── ui/
    ├── theme/             Material 3 colors & typography
    ├── nav/               Routes + bottom navigation
    ├── components/        Shared composables (product card, price formatter)
    └── screens/
        ├── home/
        ├── catalog/
        ├── product/
        ├── cart/
        ├── login/
        └── profile/
```

## TODO

- Checkout flow with Stripe SDK
- Wishlist + persisted session state
- Order history screen
- Product image zoom & multi-image gallery
- Push notifications (FCM)
