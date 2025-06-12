# Development Guide

## Build/Run Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to GitHub Pages

## Code Style Guidelines
- **Components**: Use functional components with TypeScript interfaces
- **Imports**: React core → 3rd party libs → local components → utilities
- **Naming**: PascalCase for components/interfaces, camelCase for functions/variables
- **State**: Group useState at component top with typed definitions
- **Styling**: Use Tailwind utility classes for styling
- **Functions**: Small, focused functions with verb-first naming
- **TypeScript**: Use interfaces for props/state, explicit return types
- **Error Handling**: Form validation with clear error messages
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Architecture**: Follow file-based routing with artifacts in dedicated directory