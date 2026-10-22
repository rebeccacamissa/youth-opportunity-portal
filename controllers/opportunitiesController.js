const fs = require('fs/promises');
const path = require('path');
const fetch = require('node-fetch');

function normalizeOpportunity(row) {
  return {
    id: row.id,
    title: row.title || '',
    organization: row.organization_name || row.organization || '',
    category: row.category || '',
    location: row.location || '',
    closingDate: row.closing_date || row.closingDate || null,
    experienceLevel: row.experience_level || row.experienceLevel || '',
    shortDescription: row.short_description || row.shortDescription || row.description || '',
    fullDescription: row.full_description || row.fullDescription || row.description || '',
    eligibility: row.eligibility || [],
    qualifications: row.qualifications || [],
    requirements: row.requirements || [],
    documents: row.documents || [],
    stipend: row.stipend || null,
    workArrangement: row.work_arrangement || row.workArrangement || null,
    applicationInstructions: row.application_instructions || row.applicationInstructions || [],
    sourceUrl: row.source_url || row.sourceUrl || null,
    applicationLink: row.application_url || row.application_link || row.applicationLink || null,
    verifiedStatus: Boolean(row.is_verified || row.verified_status || row.verifiedStatus),
    updatedDate: row.updated_at || row.updated_date || row.updatedDate || null
  };
}

async function listOpportunities(_request, response) {
  const projectUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!projectUrl || !anonKey) {
    const error = new Error('Opportunity data is not configured on this server.');
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const endpoint = `${projectUrl.replace(/\/$/, '')}/rest/v1/opportunities?select=*`;
    const upstream = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    });
    if (!upstream.ok) {
      console.error(`Supabase opportunities request failed with HTTP ${upstream.status}.`);
      const error = new Error('The opportunity feed is temporarily unavailable.');
      error.status = 502;
      throw error;
    }

    let rows = await upstream.json();
    if (!Array.isArray(rows)) {
      const error = new Error('The opportunity feed returned an invalid response.');
      error.status = 502;
      throw error;
    }
    if (rows.length === 0) {
      rows = JSON.parse(await fs.readFile(path.resolve(__dirname, '../data/opportunities.json'), 'utf8'));
      if (!Array.isArray(rows)) throw new Error('The local demo opportunity feed is invalid.');
      response.set('X-Opportunity-Source', 'local-demo-fallback');
    } else {
      response.set('X-Opportunity-Source', 'supabase');
    }
    response.status(200).json(rows.map(normalizeOpportunity));
  } catch (error) {
    if (error.status) throw error;
    const proxyError = new Error(
      error.name === 'AbortError'
        ? 'The opportunity feed timed out. Please try again.'
        : 'The opportunity feed is temporarily unavailable.'
    );
    proxyError.status = 502;
    throw proxyError;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { listOpportunities };
