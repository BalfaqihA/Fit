# Maestro smoke flows

End-to-end UI flows for FitLife. Maestro runs against a real device or simulator and drives the app the same way a user would.

## Install

```
brew install maestro      # macOS
```

Windows: install via the Maestro installer at `https://maestro.mobile.dev/getting-started/installing-maestro`.

## Run

Start the dev build of the app on a connected device/simulator first (`npx expo start`), then:

```
maestro test .maestro/signup.yaml
maestro test .maestro/log-workout.yaml
maestro test .maestro/sign-out-back-in.yaml
```

Or run the whole folder:

```
maestro test .maestro
```

## Notes

- Each flow expects a fresh app install (or a signed-out state). Use a throwaway email like `e2e+TIMESTAMP@example.com`.
- The flows reference user-visible text. If you rename a button, update the matching `tapOn` step.
- On CI, run with `MAESTRO_CLOUD_API_KEY` against Maestro Cloud — local emulators are flaky for reanimated worklets.
