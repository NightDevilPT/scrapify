## ScrapingSession Example 

```ts
const scrapingSession = {
  id: "sess_001",
  name: "Daily eProcure Scan",
  description: "Scraping all organizations from eProcure",
  provider: "EPROCURE",
  baseUrl: "https://eprocure.gov.in/eprocure/app",
  
  status: "RUNNING",
  progress: 20, // (10/50)*100 = 20%
  
  // Real-time stats
  organizationsDiscovered: 50,  // Found 50 organizations on website
  organizationsScraped: 10,     // Completed 10 organizations
  tendersFound: 347,            // Identified 347 tenders so far
  tendersSaved: 225,            // Saved 225 tenders to database
  pagesNavigated: 89,           // Visited 89 pages
  
  // Performance
  pagesPerMinute: 23.5,
  avgResponseTime: 1200,
  
  // Current activity
  currentOrganization: "Indian Railways",
  currentStage: "tender_details",
  
  // Timestamps
  startedAt: new Date("2024-01-15T10:30:00Z"),
  lastActivityAt: new Date("2024-01-15T11:15:30Z"),
  completedAt: null
}
```

## ScrapedTender Example
```ts
const scrapedTender = {
  id: "tender_001",
  
  // Tender identification
  tenderId: "TENDER/RAIL/2024/001",
  tenderRefNo: "REF/RAIL/2024/001",
  version: 1,
  isLatest: true,
  
  // Tender details
  tenderValue: 24500000,
  workDescription: "Supply of railway track components and maintenance",
  organisation: "Indian Railways",
  tenderInvitingAuthorityName: "Chief Engineer, Northern Railway",
  location: "New Delhi",
  publishedDate: new Date("2024-01-15T00:00:00Z"),
  bidSubmissionEndDate: new Date("2024-02-15T23:59:59Z"),
  
  // EMD details
  emdAmount: 245000,
  emdFeeType: "Fixed Amount",
  emdExceptionAllowed: false,
  
  // Scraping metadata
  provider: "EPROCURE",
  sourceUrl: "https://eprocure.gov.in/eprocure/app?component=$DirectLink&page=FrontEndViewTender&service=direct&session=T&sp=SKKFVdgPqWd9abfqUlE/IIw%3D%3D",
  scrapedAt: new Date("2024-01-15T10:45:00Z"),
  dataHash: "a1b2c3d4e5f6...",
  
  // Session reference
  sessionId: "sess_001",
  
  createdAt: new Date("2024-01-15T10:45:00Z"),
  updatedAt: new Date("2024-01-15T10:45:00Z")
}
```


export interface Tender {
	<!-- tenderId: string  -->
	<!-- tenderRefNo: string -->
	<!-- tenderValue: number -->
	<!-- workDescription: string -->
	<!-- preBidMeetingDate?: string -->
	<!-- preBidMeetingAddress?: string -->
	<!-- preBidMeetingPlace?: string -->
	<!-- periodOfWork?: string -->
	<!-- organisationChain: string -->
	<!-- tenderInvitingAuthorityName: string -->
	<!-- tenderInvitingAuthorityAddress: string -->
	<!-- emdAmount: number -->
	<!-- emdFeeType: string -->
	<!-- emdExceptionAllowed: boolean -->
	<!-- emdPercentage: number -->
	<!-- emdPayableTo: string -->
	<!-- emdPayableAt: string -->
	<!-- principal: string -->
	<!-- location: string -->
	<!-- pincode: string -->
	<!-- publishedDate: string | Date -->
	<!-- bidOpeningDate: string | Date -->
	<!-- bidSubmissionStartDate: string | Date -->
	<!-- bidSubmissionEndDate: string | Date -->
	<!-- isSuretyBondAllowed: boolean -->
	<!-- sourceOfTender?: string -->
	<!-- compressedTenderDocumentsURI?: string -->
}
