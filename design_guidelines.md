# Visual Signal Encoder/Decoder Design Guidelines

## Design Approach
**System-Based Approach**: Material Design 3 with technical tool adaptations, drawing inspiration from audio/video editing interfaces (Audacity, Premiere Pro) for timeline-based visualizations and developer tools (VS Code, Chrome DevTools) for information density.

## Core Design Principles
1. **Clarity First**: Technical precision over decorative elements
2. **Visual Hierarchy**: Clear separation between input, visualization, and output zones
3. **Dark Mode Native**: Designed for dark backgrounds to maximize color spectrum visibility
4. **Real-time Feedback**: Immediate visual response to user interactions

## Layout System

**Grid Structure**: Two-column desktop layout (60/40 split)
- Left: Controls and text input/output
- Right: Color signal visualization

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Container margins: m-4 to m-8

**Breakpoints**:
- Mobile: Single column, stacked layout
- Tablet (md:): Begin two-column for encoder/decoder
- Desktop (lg:): Full two-column with expanded visualizer

## Typography

**Font Stack**: 
- Primary: 'Inter' for UI elements and labels
- Monospace: 'JetBrains Mono' for encoded text, hex values, timing parameters

**Hierarchy**:
- H1 (App Title): text-2xl font-bold
- H2 (Section Headers): text-lg font-semibold
- Body: text-base
- Labels: text-sm font-medium
- Code/Technical: text-sm font-mono
- Captions: text-xs

## Component Library

### Input/Output Components
**Text Input Area**: 
- Textarea with monospace font
- Character counter showing encoding length
- Clear button and paste functionality
- Border highlight on focus

**Parameter Controls**:
- Slider inputs for TS_MS and TG_MS with numeric readouts
- Range: 50-500ms with 10ms increments
- Live value display beside sliders
- Reset to defaults button

### Visualization Components
**Color Signal Display**:
- Horizontal timeline showing color blocks
- Each letter rendered as colored rectangle with letter overlay
- SOF/EOF markers at start/end (larger blocks)
- Preamble white/black sequences
- Hover reveals letter and hex value
- Scalable width to accommodate message length

**Animation Controls**:
- Play/Pause toggle
- Speed multiplier (0.5x, 1x, 2x, 4x)
- Progress indicator below visualization
- Frame-by-frame step controls

### Action Buttons
**Primary Actions**:
- "Encode Message" - prominent, high-contrast
- "Decode Signal" - secondary style
- "Copy Sequence" - icon + label
- "Export Animation" - outline style

**Secondary Actions**:
- Settings gear for advanced options
- Help/documentation icon
- Share encoded message

### Information Panels
**Color Spectrum Reference**:
- Compact A-Z grid showing all letter colors
- Expandable/collapsible panel
- Each cell shows letter + hex value on hover

**Timing Information**:
- Display current symbol duration
- Guard interval display
- Total sequence duration calculation
- Frames per second indicator

## Layout Specifications

**Header Section** (h-16):
- App title and logo on left
- Theme toggle on right
- Compact, persistent across pages

**Main Content** (min-h-screen minus header):
- Left Panel (max-w-2xl):
  - Encoder section with textarea (h-40)
  - Parameter controls (stacked, gap-4)
  - Action buttons row (gap-2)
  - Decoder section with textarea (h-40)
  
- Right Panel (flex-1):
  - Visualization canvas (min-h-64, scales with content)
  - Animation controls bar below
  - Timing stats footer

**Bottom Section**:
- Color spectrum reference (collapsible, h-32 when expanded)

## Responsive Behavior
- Mobile: Stack encoder, visualizer, decoder vertically
- Tablet: 2-column for controls, full-width visualizer
- Desktop: Side-by-side layout with sticky visualizer

## Accessibility
- All controls keyboard navigable
- Color blocks include aria-labels with letter values
- Skip to visualization link
- High contrast mode alternative
- Screen reader announcements for encoding/decoding actions

## Images
No hero images required. This is a functional tool where the color visualization itself serves as the primary visual element. Focus remains on the interactive color spectrum display.