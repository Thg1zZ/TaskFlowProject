package com.taskmanager.service;

import com.taskmanager.dto.CategoryRequest;
import com.taskmanager.dto.CategoryResponse;
import com.taskmanager.entity.Category;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.CategoryRepository;
import com.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SecurityService securityService;

    public List<CategoryResponse> getAll() {
        User user = securityService.getCurrentUser();
        return categoryRepository.findByUserIdOrderByNameAsc(user.getId())
                .stream()
                .map(c -> {
                    // COUNT via query dedicada — sem carregar a coleção LAZY inteira
                    long count = categoryRepository.countTasksByCategoryId(c.getId());
                    return CategoryResponse.fromEntity(c, count);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryResponse create(CategoryRequest req) {
        User user = securityService.getCurrentUser();

        if (categoryRepository.existsByNameAndUserId(req.getName().trim(), user.getId())) {
            throw new IllegalArgumentException("Já existe uma categoria com esse nome");
        }

        Category cat = Category.builder()
                .name(req.getName().trim())
                .color(req.getColor() != null ? req.getColor() : "#3b82f6")
                .icon(req.getIcon())
                .user(user)
                .build();

        return CategoryResponse.fromEntity(categoryRepository.save(cat), 0);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest req) {
        User user = securityService.getCurrentUser();
        Category cat = categoryRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));

        // Se mudou o nome, verificar duplicata (excluindo a própria)
        String newName = req.getName().trim();
        if (!newName.equalsIgnoreCase(cat.getName()) &&
                categoryRepository.existsByNameAndUserId(newName, user.getId())) {
            throw new IllegalArgumentException("Já existe uma categoria com esse nome");
        }

        cat.setName(newName);
        if (req.getColor() != null) cat.setColor(req.getColor());
        if (req.getIcon() != null)  cat.setIcon(req.getIcon());

        long count = categoryRepository.countTasksByCategoryId(cat.getId());
        return CategoryResponse.fromEntity(categoryRepository.save(cat), count);
    }

    @Transactional
    public void delete(Long id) {
        User user = securityService.getCurrentUser();
        Category cat = categoryRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
        categoryRepository.delete(cat);
    }
}
