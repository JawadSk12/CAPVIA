# Contributing

## Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the code style
4. Add tests for new functionality
5. Run all tests: `bash scripts/ci/run-tests.sh`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push and open a Pull Request

## Code Style
- Python: Black formatter, flake8 linting
- TypeScript: ESLint + Prettier
- Commit messages: Conventional Commits format

## Testing
- Write unit tests for all new business logic
- Integration tests for API endpoints
- Aim for >80% code coverage
