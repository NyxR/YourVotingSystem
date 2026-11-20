// Chart card headers: filters sit to the right of the title on wide cards and
// drop below the title/description, full width, on narrow ones (card width,
// not screen width, via the `@container/card` on each chart's <Card>).

/** On <CardHeader>: one column while narrow. */
export const chartHeaderClass =
  'has-data-[slot=card-action]:grid-cols-1 @[640px]/card:has-data-[slot=card-action]:grid-cols-[1fr_auto]';

/** On <CardAction>: below the description while narrow, top-right when wide. */
export const chartActionClass =
  'col-start-1 col-end-[-1] row-start-auto row-end-auto mt-2 w-full justify-self-stretch @[640px]/card:col-start-2 @[640px]/card:col-end-auto @[640px]/card:row-start-1 @[640px]/card:row-end-3 @[640px]/card:mt-0 @[640px]/card:w-auto @[640px]/card:justify-self-end';

/** Row holding From/To (+ spinner, reset): two equal columns while narrow. */
export const dateRowClass =
  'flex w-full items-end gap-2 @[640px]/card:w-auto @[640px]/card:flex-wrap @[640px]/card:items-center @[640px]/card:justify-end';

/** One labelled date: label above while narrow, beside when wide. */
export const dateFieldClass =
  'flex min-w-0 flex-1 flex-col gap-1 @[640px]/card:flex-none @[640px]/card:flex-row @[640px]/card:items-center @[640px]/card:gap-1.5';

/** The date input itself. */
export const dateInputClass = 'h-8 w-full @[640px]/card:w-36';

/** Spinner / reset button: after the dates while narrow, before them when wide. */
export const dateRowExtraClass = 'order-last shrink-0 @[640px]/card:order-none';
