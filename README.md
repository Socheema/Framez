# Framez - Social Media App

A modern social media application built with React Native and Expo.

## 🚀 Tech Stack

- **Frontend**: React Native with Expo
- **Routing**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: React Native StyleSheet

## 📦 Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Socheema/Framez.git
   cd framez-social
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   - Create a `.env` file in the root directory
   - Add your Supabase credentials

4. Start the development server
   ```bash
   npx expo start
   ```

## 🏗️ Project Structure

```
framez-social/
├── app/              # File-based routing (screens)
├── components/       # Reusable UI components
├── constants/        # Theme, colors, constants
├── helpers/          # Utility functions
├── stores/           # Zustand state management
├── utils/            # Service functions
└── assets/           # Images, fonts, static files
```

## 🔧 Development

- **Web**: Press `w` in the terminal after starting
- **iOS**: Press `i` (requires Xcode)
- **Android**: Press `a` (requires Android Studio)
- **Expo Go**: Scan QR code with Expo Go app

## 📱 Features

- User authentication (sign up, login, password reset)
- User profiles with avatars
- Post creation and management
- Real-time messaging
- Image uploads
- Social interactions

## 🔒 Environment Variables

Required environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 📚 Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and proprietary.
