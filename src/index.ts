/**
 * TRVZB Scheduler Card - Entry Point
 *
 * This file imports and registers all custom elements for the TRVZB Scheduler Card.
 * Components automatically register themselves via the @customElement decorator.
 */

// Import main card and editor (these also import their dependencies)
import { TRVZBSchedulerCard } from './card';
import { TRVZBSchedulerCardEditor } from './editor';

// Import all child components (auto-register via @customElement decorator)
import './components/schedule-week-view';
import './components/schedule-graph-view';
import './components/day-schedule-editor';
import './components/transition-editor';
import './components/copy-schedule-dialog';



// Export main card class for potential external use
export { TRVZBSchedulerCard, TRVZBSchedulerCardEditor };
