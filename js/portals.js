/* portals.js - the starting list of Singapore public-sector job portals.
 * `search` is a URL template for portals whose keyword search can be linked
 * to directly; {q} is replaced with the keyword. Portals added on the page
 * are kept in the browser, not here. */
window.KitPortals = [
  { group: 'Core central portals', items: [
    { name: 'Careers@Gov job board', url: 'https://jobs.careers.gov.sg/',
      note: 'All 16 ministries and 50+ statutory boards.' },
    { name: 'Careers@Gov (Workday backend)', url: 'https://sggovterp.wd102.myworkdayjobs.com/PublicServiceCareers',
      note: 'The system behind the job board.' },
    { name: 'Careers@Gov info and tracks', url: 'https://www.careers.gov.sg/' },
    { name: 'MyCareersFuture, public service', url: 'https://www.mycareersfuture.gov.sg/job/public',
      search: 'https://www.mycareersfuture.gov.sg/search?search={q}&sortBy=new_posting_date&page=0',
      note: 'Often lists contract, temporary and agency-posted roles.' },
    { name: 'Smart Nation Tech Careers Hub', url: 'https://techcareers.smartnation.gov.sg/',
      note: 'Tech, AI and data roles across public agencies.' }
  ] },
  { group: 'Public healthcare and HealthTech', items: [
    { name: 'NHG Health', url: 'https://careers.nhghealth.com.sg/search/' },
    { name: 'SingHealth', url: 'https://careers.singhealth.com.sg/' },
    { name: 'NUHS', url: 'https://www.nuhs.edu.sg/careers-at-nuhs' },
    { name: 'Synapxe', url: 'https://careers-public-healthtech-jobs.synapxe.sg/' }
  ] },
  { group: 'Tech, defence, security and R&D agencies', items: [
    { name: 'Open Government Products (OGP)', url: 'https://www.open.gov.sg/careers/' },
    { name: 'GovTech', url: 'https://www.tech.gov.sg/careers/why-join-govtech/overview/' },
    { name: 'HTX', url: 'https://www.htx.gov.sg/join-us/careers' },
    { name: 'DSTA', url: 'https://www.dsta.gov.sg/join-us/job-seeker/dsta-careers' },
    { name: 'CSIT', url: 'https://www.csit.gov.sg/join-us' },
    { name: 'CSA', url: 'https://www.csa.gov.sg/about-csa/careers' },
    { name: 'A*STAR', url: 'https://www.a-star.edu.sg/career' },
    { name: 'MINDEF (DXO)', url: 'https://www.mindef.gov.sg/join-us/dxo/careers/' },
    { name: 'Digital and Intelligence Service (DIS)', url: 'https://www.mindef.gov.sg/discareers/' },
    { name: 'Ministry of Home Affairs (MHA)', url: 'https://www.mha.gov.sg/careers/' }
  ] },
  { group: 'Statutory boards with their own career pages', items: [
    { name: 'MAS', url: 'https://www.mas.gov.sg/who-we-are/careers' },
    { name: 'EDB', url: 'https://www.edb.gov.sg/en/about-edb/careers.html' },
    { name: 'Enterprise Singapore', url: 'https://www.enterprisesg.gov.sg/about-us/careers' },
    { name: 'IMDA', url: 'https://www.imda.gov.sg/about-imda/careers-at-imda' },
    { name: 'IRAS', url: 'https://www.iras.gov.sg/careers' },
    { name: 'CPF Board', url: 'https://www.cpf.gov.sg/member/who-we-are/careers' },
    { name: 'HDB', url: 'https://www.hdb.gov.sg/about-us/work-with-us/careers' },
    { name: 'URA', url: 'https://www.ura.gov.sg/Corporate/Careers' },
    { name: 'LTA', url: 'https://www.lta.gov.sg/content/ltagov/en/who_we_are.html/#careers' },
    { name: 'JTC', url: 'https://www.jtc.gov.sg/about-jtc/careers/join-us' },
    { name: 'BCA', url: 'https://www1.bca.gov.sg/about-us/careers' },
    { name: 'SLA', url: 'https://www.sla.gov.sg/join-us/our-work-at-sla' },
    { name: 'NParks', url: 'https://www.nparks.gov.sg/nparks-careers-and-scholarships' },
    { name: 'STB', url: 'https://www.stb.gov.sg/about-stb/careers-at-stb' }
  ] },
  { group: 'Autonomous universities', items: [
    { name: 'NUS', url: 'https://careers.nus.edu.sg/' },
    { name: 'NTU', url: 'https://ntu.wd3.myworkdayjobs.com/Careers' },
    { name: 'SMU', url: 'https://careers.smu.edu.sg/' },
    { name: 'SUTD', url: 'https://careers.sutd.edu.sg/' },
    { name: 'SIT', url: 'https://careers.singaporetech.edu.sg/' },
    { name: 'SUSS', url: 'https://careers.suss.edu.sg/' }
  ] },
  { group: 'Sovereign wealth and government-linked', items: [
    { name: 'GIC', url: 'https://careers.gic.com.sg/' },
    { name: 'Temasek', url: 'https://www.temasek.com.sg/en/careers' },
    { name: 'ST Engineering', url: 'https://careers.stengg.com/' },
    { name: 'NCS', url: 'https://www.ncs.co/en-sg/opportunities/' }
  ] }
];
