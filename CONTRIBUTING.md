# Contributing to Mastra Live Transcriber

Thank you for your interest in contributing! 🎉

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/shay2301/mastra-transcription-agent/issues)
2. If not, create a new issue using the bug report template
3. Include as much detail as possible:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Relevant logs

### Suggesting Features

1. Check existing [feature requests](https://github.com/shay2301/mastra-transcription-agent/issues?q=is%3Aissue+label%3Aenhancement)
2. Create a new issue using the feature request template
3. Explain the use case and benefits

### Pull Requests

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes**:
   - Write clean, readable code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation
5. **Test your changes**:
   ```bash
   npm test
   npm run dev  # Manual testing
   ```
6. **Commit** with a clear message:
   ```bash
   git commit -m "Add: brief description of changes"
   ```
7. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a Pull Request** on GitHub

### Code Style

- Use TypeScript
- Follow existing patterns in the codebase
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Testing

- Add unit tests for new functions
- Add E2E tests for new features
- Ensure all tests pass: `npm test`
- Manual testing with: `npm run dev`

### Documentation

- Update README.md if needed
- Add JSDoc comments for public APIs
- Update DISCORD_SETUP.md for Discord changes
- Keep examples up to date

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mastra-transcription-agent.git
cd mastra-transcription-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your OpenRouter API key to .env.local

# Start development server
npm run dev
```

## Project Structure

```
src/
  agent/          # Mastra agent implementation
  services/       # Core services (OpenRouter, audio, merge)
  routes/         # API routes (transcribe, WebSocket)
  discord/        # Discord bot integration
  zoom/           # Zoom integration scaffold
ui/               # Web UI (HTML/CSS/JS)
tests/            # Tests
scripts/          # Utility scripts
```

## Questions?

Open an issue or reach out to [@shay2301](https://github.com/shay2301)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
