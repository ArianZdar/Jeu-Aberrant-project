import { TestBed } from '@angular/core/testing';
import { FormDataService } from './form-data.service';

describe('FormDataService', () => {
    let service: FormDataService;
    let data: { name: string; description: string; size: number; mode: string };

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(FormDataService);
        data = { name: 'Test', description: 'Test Description', size: 10, mode: 'Test Mode' };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('setFormData() should set formData', () => {
        service.setFormData(data);
        expect(service.getFormData()).toEqual(data);
    });

    it('getFormData() should return formData', () => {
        service.setFormData(data);
        expect(service.getFormData()).toEqual(data);
    });

    it('isModifyingAGame() should set isNewGame and id', () => {
        service.isModifyingAGame(false, '1');
        expect(service.getIsNewGame()).toBeTrue();
        expect(service.getId()).toEqual('-1');
    });

    it('getId() should return id', () => {
        service.isModifyingAGame(true, '1');
        expect(service.getId()).toEqual('1');
    });

    it('resetFormData() should reset formData', () => {
        service.setFormData(data);
        service.isModifyingAGame(false, '1');
        service.resetFormData();
        expect(service.getFormData()).toEqual({ name: '', description: '', size: 10, mode: 'Classique' });
        expect(service.getIsNewGame()).toBeTrue();
        expect(service.getId()).toEqual('-1');
    });
});
