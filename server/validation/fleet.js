import { z } from 'zod';

import { isValidDateOnly } from '../lib/time.js';
import { nameField, textField } from './normalize.js';

/**
 * The fleet: physical cars.
 *
 * Every schema is `.strict()`. Nothing here carries money — a car has no fare,
 * the class it is sold as does.
 */

const VEHICLE_BODIES = ['sedan', 'suv', 'minivan', 'van', 'bus'];
const TRANSFER_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

/** The class feature vocabulary, plus the one thing a specific car can promise that a class cannot. */
export const FLEET_FEATURES = [
    'airConditioning',
    'wifi',
    'childSeat',
    'englishDriver',
    'meetGreet',
    'flightTracking',
    'bottledWater',
    'freeWaiting',
    'wheelchairAccessible'
];

export const VEHICLE_DOCUMENT_TYPES = ['REGISTRATION', 'INSURANCE', 'TECHNICAL_INSPECTION', 'OTHER'];

/** A calendar date, validated as one rather than as a string that looks like one. */
export const dateOnlyField = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use YYYY-MM-DD' })
    .refine(isValidDateOnly, { message: 'That date does not exist' });

/** As typed. Matching is done on the normalised form in the service. */
const plateField = z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9 -]+$/, { message: 'Letters, digits, spaces and dashes only' });

const idField = z.string().min(1).max(64);

const statusFilter = z.union([z.enum(TRANSFER_STATUSES), z.array(z.enum(TRANSFER_STATUSES))]).optional();

export const fleetQuerySchema = z
    .object({
        providerId: idField.optional(),
        vehicleClassId: idField.optional(),
        status: statusFilter,
        search: z.string().trim().min(1).max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
    })
    .strict();

export const createFleetVehicleSchema = z
    .object({
        providerId: idField,
        vehicleClassId: idField,
        make: nameField,
        model: nameField,
        year: z.number().int().min(1980).max(2100).nullish(),
        colour: textField(40).nullish(),
        body: z.enum(VEHICLE_BODIES),
        plateNumber: plateField,
        vin: z.string().trim().min(5).max(32).nullish(),
        passengerCapacity: z.number().int().min(1).max(80),
        luggageCapacity: z.number().int().min(0).max(80),
        cabinBagCapacity: z.number().int().min(0).max(80).default(0),
        features: z.array(z.enum(FLEET_FEATURES)).max(FLEET_FEATURES.length).default([]),
        description: textField(2000).nullish(),
        internalNotes: textField(4000).nullish(),
        status: z.enum(TRANSFER_STATUSES).default('DRAFT')
    })
    .strict();

export const updateFleetVehicleSchema = createFleetVehicleSchema.partial();

export const attachFleetImageSchema = z
    .object({
        fileAssetId: idField,
        caption: textField(300).nullish(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        isCover: z.boolean().optional()
    })
    .strict();

export const updateFleetImageSchema = z
    .object({
        caption: textField(300).nullish(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        isCover: z.boolean().optional()
    })
    .strict();

export const imageOrderSchema = z
    .object({
        order: z.array(idField).min(1).max(100)
    })
    .strict();

/** Shared by the fleet and driver document libraries; each passes its own type list. */
export const attachDocumentSchema = (docTypes) =>
    z
        .object({
            fileAssetId: idField,
            docType: z.enum(docTypes),
            label: textField(200).nullish(),
            validUntil: dateOnlyField.nullish()
        })
        .strict();

export const attachVehicleDocumentSchema = attachDocumentSchema(VEHICLE_DOCUMENT_TYPES);

export const idParamSchema = z.object({ id: idField });
export const imageParamSchema = z.object({ id: idField, imageId: idField });
export const documentParamSchema = z.object({ id: idField, documentId: idField });
