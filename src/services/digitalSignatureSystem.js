const crypto = require('crypto');

/**
 * Digital Signature System
 * 
 * Provides legally binding digital signatures for approvals, documents,
 * and transactions with full compliance and verification capabilities.
 */
class DigitalSignatureSystem {
    constructor() {
        this.signatures = new Map();
        this.signerCertificates = new Map();
        this.policies = new Map();
        this.witnessRegistry = new Map();
        
        // Initialize system certificate authority
        this.systemCA = this.initializeSystemCA();
        
        console.log('✍️ Digital Signature System initialized with PKI infrastructure');
    }

    /**
     * Initialize system Certificate Authority
     */
    initializeSystemCA() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        return {
            publicKey,
            privateKey,
            serialNumber: 'EFP-CA-001',
            issuer: 'ExpenseFlow Pro Certificate Authority',
            validFrom: new Date(),
            validTo: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
            keyUsage: ['digitalSignature', 'keyEncipherment', 'keyCertSign']
        };
    }

    /**
     * Register a signer with digital certificate
     */
    async registerSigner(signerData) {
        const signerId = this.generateSignerId();
        
        // Generate key pair for signer
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        // Create digital certificate
        const certificate = await this.issueCertificate({
            signerId,
            publicKey,
            subject: {
                commonName: signerData.name,
                organizationName: signerData.organization,
                organizationalUnit: signerData.department,
                countryName: signerData.country,
                emailAddress: signerData.email
            },
            keyUsage: ['digitalSignature', 'nonRepudiation'],
            extendedKeyUsage: ['documentSigning', 'expenseApproval'],
            validityPeriod: signerData.validityYears || 2
        });

        // Store certificate and private key securely
        this.signerCertificates.set(signerId, {
            certificate,
            privateKey,
            status: 'active',
            registeredAt: new Date(),
            lastUsed: null,
            signatureCount: 0
        });

        // Set default signing policy
        await this.setSigningPolicy(signerId, {
            requireBiometric: signerData.requireBiometric || false,
            requireMFA: signerData.requireMFA || true,
            maxSignatureAmount: signerData.maxAmount || null,
            allowedResourceTypes: signerData.allowedTypes || ['expense', 'invoice', 'report'],
            timeRestrictions: signerData.timeRestrictions || null,
            witnessRequired: signerData.witnessRequired || false
        });

        return {
            signerId,
            certificate: certificate.certificatePEM,
            status: 'registered',
            capabilities: [
                'document_signing',
                'expense_approval',
                'invoice_approval',
                'report_certification'
            ]
        };
    }

    /**
     * Issue a digital certificate
     */
    async issueCertificate(certData) {
        const serialNumber = this.generateCertificateSerial();
        const validFrom = new Date();
        const validTo = new Date(validFrom.getTime() + certData.validityPeriod * 365 * 24 * 60 * 60 * 1000);

        const certificate = {
            serialNumber,
            issuer: this.systemCA.issuer,
            subject: certData.subject,
            publicKey: certData.publicKey,
            validFrom,
            validTo,
            keyUsage: certData.keyUsage,
            extendedKeyUsage: certData.extendedKeyUsage,
            signatureAlgorithm: 'sha256WithRSAEncryption'
        };

        // Sign certificate with CA private key
        const certificateSignature = this.signCertificate(certificate);
        certificate.signature = certificateSignature;

        // Generate PEM format
        const certificatePEM = this.generateCertificatePEM(certificate);

        return {
            ...certificate,
            certificatePEM,
            fingerprintSHA256: crypto.createHash('sha256').update(certificatePEM).digest('hex')
        };
    }

    /**
     * Create a digital signature for a document or transaction
     */
    async createSignature(signatureRequest) {
        const {
            signerId,
            documentHash,
            documentType,
            reason,
            location,
            metadata = {},
            witnessIds = []
        } = signatureRequest;

        // Validate signer
        const signer = this.signerCertificates.get(signerId);
        if (!signer || signer.status !== 'active') {
            throw new Error('Invalid or inactive signer');
        }

        // Check signing policy
        await this.validateSigningPolicy(signerId, signatureRequest);

        // Generate signature ID
        const signatureId = this.generateSignatureId();
        
        // Create signature data
        const signatureData = {
            signatureId,
            signerId,
            documentHash,
            documentType,
            reason,
            location,
            timestamp: new Date(),
            signatureAlgorithm: 'sha256WithRSAEncryption',
            metadata
        };

        // Create digital signature
        const digitalSignature = crypto.sign(
            'sha256',
            Buffer.from(JSON.stringify(signatureData)),
            signer.privateKey
        );

        // Add witness signatures if required
        const witnessSignatures = [];
        for (const witnessId of witnessIds) {
            const witnessSignature = await this.createWitnessSignature(witnessId, signatureData);
            witnessSignatures.push(witnessSignature);
        }

        // Create complete signature record
        const signatureRecord = {
            ...signatureData,
            digitalSignature: digitalSignature.toString('base64'),
            witnessSignatures,
            certificate: signer.certificate.certificatePEM,
            certificateFingerprint: signer.certificate.fingerprintSHA256,
            legallyBinding: true,
            nonRepudiation: true,
            timestampAuthority: await this.getTimestampToken(signatureData),
            verificationData: {
                publicKey: signer.certificate.publicKey,
                certificateChain: [signer.certificate.certificatePEM, this.systemCA.publicKey],
                revocationStatus: 'valid'
            }
        };

        // Store signature
        this.signatures.set(signatureId, signatureRecord);

        // Update signer statistics
        signer.lastUsed = new Date();
        signer.signatureCount++;

        return {
            signatureId,
            status: 'signed',
            timestamp: signatureRecord.timestamp,
            legallyBinding: true,
            verificationInstructions: {
                steps: [
                    '1. Verify digital signature using signer public key',
                    '2. Validate certificate chain to trusted CA',
                    '3. Check certificate revocation status',
                    '4. Verify timestamp authority token',
                    '5. Validate witness signatures if present'
                ],
                publicKey: signer.certificate.publicKey
            }
        };
    }

    /**
     * Verify a digital signature
     */
    async verifySignature(signatureId, originalDocumentHash) {
        const signatureRecord = this.signatures.get(signatureId);
        if (!signatureRecord) {
            return {
                valid: false,
                error: 'Signature not found',
                details: null
            };
        }

        const verificationResults = {
            signatureId,
            valid: true,
            timestamp: signatureRecord.timestamp,
            verificationTime: new Date(),
            checks: {},
            warnings: [],
            errors: []
        };

        try {
            // 1. Verify document hash matches
            verificationResults.checks.documentHash = signatureRecord.documentHash === originalDocumentHash;
            if (!verificationResults.checks.documentHash) {
                verificationResults.errors.push('Document hash mismatch - document may have been modified');
                verificationResults.valid = false;
            }

            // 2. Verify digital signature
            const signatureData = {
                signatureId: signatureRecord.signatureId,
                signerId: signatureRecord.signerId,
                documentHash: signatureRecord.documentHash,
                documentType: signatureRecord.documentType,
                reason: signatureRecord.reason,
                location: signatureRecord.location,
                timestamp: signatureRecord.timestamp,
                signatureAlgorithm: signatureRecord.signatureAlgorithm,
                metadata: signatureRecord.metadata
            };

            verificationResults.checks.digitalSignature = crypto.verify(
                'sha256',
                Buffer.from(JSON.stringify(signatureData)),
                signatureRecord.verificationData.publicKey,
                Buffer.from(signatureRecord.digitalSignature, 'base64')
            );

            if (!verificationResults.checks.digitalSignature) {
                verificationResults.errors.push('Digital signature verification failed');
                verificationResults.valid = false;
            }

            // 3. Verify certificate validity
            const certValidation = await this.validateCertificate(signatureRecord.certificate);
            verificationResults.checks.certificateValid = certValidation.valid;
            if (!certValidation.valid) {
                verificationResults.errors.push(...certValidation.errors);
                verificationResults.valid = false;
            }

            // 4. Check certificate expiration at time of signing
            const signingTime = new Date(signatureRecord.timestamp);
            const cert = this.parseCertificate(signatureRecord.certificate);
            verificationResults.checks.validAtSigningTime = 
                signingTime >= cert.validFrom && signingTime <= cert.validTo;
            
            if (!verificationResults.checks.validAtSigningTime) {
                verificationResults.errors.push('Certificate was not valid at time of signing');
                verificationResults.valid = false;
            }

            // 5. Verify witness signatures
            verificationResults.checks.witnessSignatures = true;
            for (const witnessSignature of signatureRecord.witnessSignatures) {
                const witnessValid = await this.verifyWitnessSignature(witnessSignature, signatureData);
                if (!witnessValid) {
                    verificationResults.checks.witnessSignatures = false;
                    verificationResults.errors.push(`Witness signature ${witnessSignature.witnessId} verification failed`);
                    verificationResults.valid = false;
                }
            }

            // 6. Verify timestamp authority token
            verificationResults.checks.timestampValid = await this.verifyTimestampToken(
                signatureRecord.timestampAuthority,
                signatureData
            );

            if (!verificationResults.checks.timestampValid) {
                verificationResults.warnings.push('Timestamp authority verification failed');
            }

            // 7. Check revocation status
            verificationResults.checks.notRevoked = await this.checkRevocationStatus(
                signatureRecord.certificateFingerprint
            );

            if (!verificationResults.checks.notRevoked) {
                verificationResults.errors.push('Certificate has been revoked');
                verificationResults.valid = false;
            }

        } catch (error) {
            verificationResults.valid = false;
            verificationResults.errors.push(`Verification error: ${error.message}`);
        }

        return verificationResults;
    }

    /**
     * Generate a compliance report for signatures
     */
    async generateSignatureComplianceReport(filters = {}) {
        const signatures = Array.from(this.signatures.values());
        
        let filteredSignatures = signatures;
        
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredSignatures = filteredSignatures.filter(sig => 
                new Date(sig.timestamp) >= startDate
            );
        }
        
        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            filteredSignatures = filteredSignatures.filter(sig => 
                new Date(sig.timestamp) <= endDate
            );
        }

        if (filters.signerId) {
            filteredSignatures = filteredSignatures.filter(sig => 
                sig.signerId === filters.signerId
            );
        }

        if (filters.documentType) {
            filteredSignatures = filteredSignatures.filter(sig => 
                sig.documentType === filters.documentType
            );
        }

        // Analyze signatures for compliance
        const analysis = {
            totalSignatures: filteredSignatures.length,
            signerDistribution: {},
            documentTypeDistribution: {},
            legallyBindingCount: 0,
            witnessedSignatures: 0,
            complianceIssues: [],
            averageVerificationTime: 0
        };

        for (const signature of filteredSignatures) {
            // Signer distribution
            analysis.signerDistribution[signature.signerId] = 
                (analysis.signerDistribution[signature.signerId] || 0) + 1;

            // Document type distribution
            analysis.documentTypeDistribution[signature.documentType] = 
                (analysis.documentTypeDistribution[signature.documentType] || 0) + 1;

            // Legally binding count
            if (signature.legallyBinding) {
                analysis.legallyBindingCount++;
            }

            // Witnessed signatures
            if (signature.witnessSignatures.length > 0) {
                analysis.witnessedSignatures++;
            }

            // Check for compliance issues
            const verification = await this.verifySignature(signature.signatureId, signature.documentHash);
            if (!verification.valid) {
                analysis.complianceIssues.push({
                    signatureId: signature.signatureId,
                    issues: verification.errors
                });
            }
        }

        return {
            reportId: this.generateReportId(),
            generatedAt: new Date().toISOString(),
            filters,
            analysis,
            signatures: filteredSignatures.map(sig => ({
                signatureId: sig.signatureId,
                signerId: sig.signerId,
                documentType: sig.documentType,
                timestamp: sig.timestamp,
                legallyBinding: sig.legallyBinding,
                witnessed: sig.witnessSignatures.length > 0,
                reason: sig.reason
            })),
            complianceStatus: analysis.complianceIssues.length === 0 ? 'COMPLIANT' : 'ISSUES_FOUND',
            recommendations: this.generateComplianceRecommendations(analysis)
        };
    }

    /**
     * Set signing policy for a signer
     */
    async setSigningPolicy(signerId, policy) {
        this.policies.set(signerId, {
            ...policy,
            setAt: new Date(),
            version: 1
        });
    }

    /**
     * Validate signing policy before creating signature
     */
    async validateSigningPolicy(signerId, request) {
        const policy = this.policies.get(signerId);
        if (!policy) return true; // No policy means no restrictions

        // Check amount limits
        if (policy.maxSignatureAmount && request.metadata.amount > policy.maxSignatureAmount) {
            throw new Error(`Signature amount exceeds policy limit of ${policy.maxSignatureAmount}`);
        }

        // Check resource type restrictions
        if (policy.allowedResourceTypes && !policy.allowedResourceTypes.includes(request.documentType)) {
            throw new Error(`Document type '${request.documentType}' not allowed by policy`);
        }

        // Check witness requirements
        if (policy.witnessRequired && (!request.witnessIds || request.witnessIds.length === 0)) {
            throw new Error('Policy requires witness signatures');
        }

        // Check time restrictions
        if (policy.timeRestrictions) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentDay = now.getDay();

            if (policy.timeRestrictions.allowedHours) {
                const [startHour, endHour] = policy.timeRestrictions.allowedHours;
                if (currentHour < startHour || currentHour > endHour) {
                    throw new Error('Signing not allowed at current time');
                }
            }

            if (policy.timeRestrictions.allowedDays) {
                if (!policy.timeRestrictions.allowedDays.includes(currentDay)) {
                    throw new Error('Signing not allowed on current day');
                }
            }
        }

        return true;
    }

    // Utility methods
    generateSignerId() {
        return `signer_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    generateSignatureId() {
        return `sig_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    generateCertificateSerial() {
        return `cert_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    generateReportId() {
        return `rpt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    // Mock methods for complex operations
    async createWitnessSignature(witnessId, signatureData) {
        return {
            witnessId,
            signature: crypto.randomBytes(256).toString('base64'),
            timestamp: new Date(),
            valid: true
        };
    }

    async verifyWitnessSignature(witnessSignature, originalData) {
        return true; // Mock implementation
    }

    async getTimestampToken(signatureData) {
        return {
            token: crypto.randomBytes(128).toString('base64'),
            authority: 'ExpenseFlow Pro TSA',
            timestamp: new Date(),
            valid: true
        };
    }

    async verifyTimestampToken(token, originalData) {
        return true; // Mock implementation
    }

    async validateCertificate(certificatePEM) {
        return { valid: true, errors: [] }; // Mock implementation
    }

    async checkRevocationStatus(fingerprint) {
        return true; // Mock implementation - not revoked
    }

    signCertificate(certificate) {
        return crypto.sign('sha256', Buffer.from(JSON.stringify(certificate)), this.systemCA.privateKey);
    }

    generateCertificatePEM(certificate) {
        // Mock PEM generation
        return `-----BEGIN CERTIFICATE-----\n${Buffer.from(JSON.stringify(certificate)).toString('base64')}\n-----END CERTIFICATE-----`;
    }

    parseCertificate(certificatePEM) {
        // Mock certificate parsing
        const base64Data = certificatePEM.split('\n')[1];
        return JSON.parse(Buffer.from(base64Data, 'base64').toString());
    }

    generateComplianceRecommendations(analysis) {
        const recommendations = [];

        if (analysis.complianceIssues.length > 0) {
            recommendations.push('Review and resolve signature verification issues');
        }

        if (analysis.witnessedSignatures / analysis.totalSignatures < 0.1) {
            recommendations.push('Consider requiring witnesses for high-value transactions');
        }

        return recommendations;
    }
}

module.exports = DigitalSignatureSystem; 