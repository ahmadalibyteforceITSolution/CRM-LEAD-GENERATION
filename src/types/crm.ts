export type LeadSource =
  | 'Google Maps'
  | 'Google Search / SERP'
  | 'LinkedIn'
  | 'Website'
  | 'Google Ads'
  | 'Meta Ads'
  | 'Referral'
  | 'Existing Database'
  | 'Other';

export type ContactChannel =
  | 'Cold Call'
  | 'WhatsApp Call'
  | 'WhatsApp Chat'
  | 'Email'
  | 'LinkedIn'
  | 'SMS'
  | 'Meeting'
  | 'Website Enquiry';

export type PipelineStage =
  | 'New Lead'
  | 'Call Attempted'
  | 'Contacted'
  | 'WhatsApp Sent'
  | 'Interested'
  | 'Follow-Up Required'
  | 'Meeting Scheduled'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won / Closed'
  | 'Lost';

export type LeadPriority = 'Hot' | 'Warm' | 'Cold' | 'Not Qualified';

export type CallOutcome =
  | 'Answered'
  | 'Busy'
  | 'Number Switched Off'
  | 'Wrong Number'
  | 'Call Rejected'
  | 'No Response'
  | 'Call Back Requested'
  | 'Interested'
  | 'Not Interested';

export interface Salesperson {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  activeLeadsCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  companyName?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token?: string | null;
}

export interface ColdCallLog {
  id: string;
  leadId: string;
  callDate: string; // YYYY-MM-DD
  callTime: string; // HH:mm
  calledBy: string;
  assignedTo: string;
  callDurationSeconds: number; // in seconds
  callAnswered: boolean;
  outcomes: CallOutcome[];
  decisionMakerAvailable: boolean;
  callNotes: string;
  nextAction: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  createdAt: string;
}

export interface WhatsAppLog {
  id: string;
  leadId: string;
  messageSent: boolean;
  messageSentDate: string;
  messageSentTime: string;
  messageRead: boolean;
  customerReplied: boolean;
  whatsAppCallMade: boolean;
  whatsAppCallAttended: boolean;
  conversationNotes: string;
  documentsSent: boolean;
  proposalSent: boolean;
  followUpRequired: boolean;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  templateUsed?: string;
  createdAt: string;
}

export interface ActivityHistoryItem {
  id: string;
  leadId: string;
  date: string;
  time: string;
  channel: ContactChannel;
  salesperson: string;
  attendedOrResponded: 'Answered' | 'Replied' | 'Attended' | 'No Response' | 'Rejected' | 'Scheduled';
  status: PipelineStage | string;
  notes: string;
  nextFollowUp: string; // e.g. "20 Aug, 3:00 PM"
  type: 'call' | 'whatsapp' | 'meeting' | 'note' | 'stage_change' | 'email';
  createdAt: string;
}

export interface Lead {
  id: string;
  // Lead Information
  name: string;
  companyName: string;
  phoneNumber: string;
  whatsAppNumber: string;
  email: string;
  industry: string;
  city: string;
  fullAddress?: string;
  serviceRequired: string;
  leadSource: LeadSource;
  dateLeadAdded: string;
  notes: string;
  dealValue?: number;
  projectType?: string;
  areaSize?: string;
  budgetRange?: string;
  timeline?: string;
  projectLocation?: string;

  // Pipeline & Priority
  stage: PipelineStage;
  priority: LeadPriority;

  // Assignment & Ownership
  assignedSalesperson: string;
  assignedDate: string;
  assignedTime: string;
  assignedBy: string;
  territory: string;
  currentOwner: string;
  lastContactedBy: string;
  lastContactDate: string;
  lastContactTime: string;
  nextFollowUpOwner: string;

  // Next Action & Follow-up (Mandatory 5-Rules)
  nextAction: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  preferredChannel?: ContactChannel;

  // Stats / Counters
  totalCalls: number;
  totalWhatsApp: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RuleComplianceStatus {
  isCompliant: boolean;
  hasAssignedPerson: boolean;
  hasLeadStatus: boolean;
  hasLastContact: boolean;
  hasNextAction: boolean;
  hasNextFollowUp: boolean;
  missingCount: number;
  missingFields: string[];
}

export type SmartQueueFilter =
  | 'all'
  | 'due_today'
  | 'upcoming'
  | 'overdue'
  | 'not_contacted'
  | 'no_response'
  | 'hot_leads'
  | 'proposals_pending'
  | 'missing_rules';
